import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize, resolve, sep } from "node:path";
import { config, publicBase } from "./config.mjs";
import {
  createUser,
  findProgramme,
  findProgrammeByShareToken,
  findUserByEmail,
  findUserById,
  listProgrammes,
  putProgramme,
  removeProgramme,
  setShareToken,
} from "./db.mjs";
import { randomBytes } from "node:crypto";
import { qrSvg } from "./qr.mjs";
import {
  clientFingerprint,
  currentUser,
  endSession,
  hashPassword,
  isValidEmail,
  newUserId,
  normalizeEmail,
  publicUser,
  readCookie,
  sessionCookie,
  startSession,
  verifyPassword,
} from "./auth.mjs";
import { isProgramme } from "./programme.mjs";
import {
  transcribeAudio,
  transcriptionModel,
  transcriptionReady,
} from "./transcribe.mjs";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".mp4": "video/mp4",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webm": "video/webm",
  ".webmanifest": "application/manifest+json",
  ".woff2": "font/woff2",
};

function send(response, status, body, headers = {}) {
  const payload = JSON.stringify(body);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...securityHeaders,
    ...headers,
  });
  response.end(payload);
}

/** Grunnleggende sikkerhetshoder på alt serveren svarer. */
const securityHeaders = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
  "Content-Security-Policy":
    "default-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; style-src 'self' 'unsafe-inline'; script-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
};

function sendError(response, status, message) {
  send(response, status, { error: message });
}

async function readBody(request, limit) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      const error = new Error("Forespørselen er for stor.");
      error.status = 413;
      throw error;
    }
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

async function readJson(request) {
  const body = await readBody(request, config.maxJsonBytes);
  if (!body.length) return {};
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    const error = new Error("Ugyldig JSON.");
    error.status = 400;
    throw error;
  }
}

function sessionCookieHeader(token, maxAgeSeconds) {
  const parts = [
    `${sessionCookie}=${encodeURIComponent(token)}`,
    "HttpOnly",
    "SameSite=Lax",
    "Path=/",
    `Max-Age=${maxAgeSeconds}`,
  ];
  if (config.secureCookies) parts.push("Secure");
  return parts.join("; ");
}

/** Enkel hastighetsbegrensning på innlogging og registrering. */
function createLimiter({ windowMs, max }) {
  const hits = new Map();
  return function allow(key) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter(
      (time) => now - time < windowMs,
    );
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > 5000) hits.clear();
    return recent.length <= max;
  };
}

function serveStatic(request, response, pathname) {
  const target = resolve(join(config.distDir, normalize(pathname)));
  if (!target.startsWith(config.distDir + sep)) return false;
  if (!existsSync(target) || !statSync(target).isFile()) return false;
  response.writeHead(200, {
    "Content-Type": contentTypes[extname(target)] || "application/octet-stream",
    ...securityHeaders,
  });
  createReadStream(target).pipe(response);
  return true;
}

export function createApp({
  database,
  transcribe = transcribeAudio,
  ready = transcriptionReady,
}) {
  const authLimiter = createLimiter({ windowMs: 10 * 60 * 1000, max: 30 });

  async function handleAuth(request, response, action) {
    const fingerprint = clientFingerprint(request);
    if (!authLimiter(`${action}:${fingerprint}`))
      return sendError(
        response,
        429,
        "For mange forsøk. Vent noen minutter og prøv igjen.",
      );

    const body = await readJson(request);
    const email = normalizeEmail(body.email);
    const password = String(body.password || "");
    if (!isValidEmail(email))
      return sendError(response, 400, "Skriv inn en gyldig e-postadresse.");
    if (password.length < config.minPasswordLength)
      return sendError(
        response,
        400,
        `Passordet må ha minst ${config.minPasswordLength} tegn.`,
      );

    if (action === "register") {
      if (findUserByEmail(database, email))
        return sendError(
          response,
          409,
          "Det finnes allerede en konto med denne e-postadressen.",
        );
      const { hash, salt } = hashPassword(password);
      const id = newUserId();
      createUser(database, {
        id,
        email,
        hash,
        salt,
        createdAt: new Date().toISOString(),
      });
      const user = findUserById(database, id);
      const session = startSession(database, id, config.sessionDays);
      return send(
        response,
        201,
        { user: publicUser(user) },
        {
          "Set-Cookie": sessionCookieHeader(
            session.token,
            config.sessionDays * 24 * 60 * 60,
          ),
        },
      );
    }

    const user = findUserByEmail(database, email);
    if (!user || !verifyPassword(password, user))
      return sendError(response, 401, "Feil e-post eller passord.");
    const session = startSession(database, user.id, config.sessionDays);
    return send(
      response,
      200,
      { user: publicUser(user) },
      {
        "Set-Cookie": sessionCookieHeader(
          session.token,
          config.sessionDays * 24 * 60 * 60,
        ),
      },
    );
  }

  return async function handle(request, response) {
    const url = new URL(request.url || "/", `http://${request.headers.host}`);
    const { pathname } = url;
    const method = request.method || "GET";

    try {
      if (pathname.startsWith("/api/")) {
        if (pathname === "/api/health")
          return send(response, 200, { ok: true });

        if (pathname === "/api/auth/me") {
          const session = currentUser(database, request);
          return session
            ? send(response, 200, { user: publicUser(session.user) })
            : sendError(response, 401, "Ikke innlogget.");
        }

        if (pathname === "/api/auth/logout" && method === "POST") {
          endSession(database, readCookie(request, sessionCookie));
          return send(
            response,
            204,
            {},
            {
              "Set-Cookie": sessionCookieHeader("", 0),
            },
          );
        }

        if (
          (pathname === "/api/auth/register" ||
            pathname === "/api/auth/login") &&
          method === "POST"
        )
          return await handleAuth(
            request,
            response,
            pathname.endsWith("register") ? "register" : "login",
          );

        if (pathname === "/api/transcribe") {
          if (method === "GET")
            return send(response, 200, {
              ready: ready(),
              model: transcriptionModel(),
              error: ready()
                ? undefined
                : "Ingen OPENAI_API_KEY funnet lokalt.",
            });
          if (method !== "POST")
            return sendError(response, 405, "Bruk POST med lyd.");
          const audio = await readBody(request, config.maxAudioBytes);
          const result = await transcribe(
            audio,
            request.headers["content-type"],
          );
          return send(response, 200, result);
        }

        // Pasientvisningen er åpen for alle med lenken, men inneholder bare
        // programmet — aldri kontoopplysninger.
        const shared = pathname.match(/^\/api\/shared\/([A-Za-z0-9_-]{16,})$/);
        if (shared && method === "GET") {
          const programme = findProgrammeByShareToken(database, shared[1]);
          if (!programme)
            return sendError(response, 404, "Fant ikke programmet.");
          return send(response, 200, { programme });
        }
        const sharedQr = pathname.match(
          /^\/api\/shared\/([A-Za-z0-9_-]{16,})\/qr\.svg$/,
        );
        if (sharedQr && method === "GET") {
          const programme = findProgrammeByShareToken(database, sharedQr[1]);
          if (!programme)
            return sendError(response, 404, "Fant ikke programmet.");
          const shareUrl = `${publicBase(url)}/p/${sharedQr[1]}`;
          const svg = await qrSvg(shareUrl);
          response.writeHead(200, {
            "Content-Type": "image/svg+xml; charset=utf-8",
            "Cache-Control": "no-store",
            ...securityHeaders,
          });
          return response.end(svg);
        }

        const session = currentUser(database, request);
        if (!session) return sendError(response, 401, "Ikke innlogget.");
        const userId = session.user.id;

        if (pathname === "/api/programmes" && method === "GET")
          return send(response, 200, {
            programmes: listProgrammes(database, userId),
          });

        const match = pathname.match(/^\/api\/programmes\/([^/]+)$/);
        const share = pathname.match(/^\/api\/programmes\/([^/]+)\/share$/);
        if (share && method === "POST") {
          const id = decodeURIComponent(share[1]);
          const stored = findProgramme(database, userId, id);
          if (!stored) return sendError(response, 404, "Fant ikke programmet.");
          const token =
            stored.share_token || randomBytes(24).toString("base64url");
          if (!stored.share_token) setShareToken(database, userId, id, token);
          const base = publicBase(url);
          return send(response, 200, {
            token,
            path: `/p/${token}`,
            url: `${base}/p/${token}`,
            qr: `${base}/api/shared/${token}/qr.svg`,
          });
        }
        if (share && method === "DELETE") {
          const id = decodeURIComponent(share[1]);
          const stored = findProgramme(database, userId, id);
          if (!stored) return sendError(response, 404, "Fant ikke programmet.");
          setShareToken(
            database,
            userId,
            id,
            randomBytes(24).toString("base64url"),
          );
          return send(response, 204, {});
        }
        if (match) {
          const id = decodeURIComponent(match[1]);
          if (method === "PUT") {
            const body = await readJson(request);
            if (!isProgramme(body) || body.id !== id)
              return sendError(response, 400, "Ugyldig program.");
            const stored = findProgramme(database, userId, id);
            const { shareToken: _ignored, ...clean } = body;
            if (stored && stored.revision !== body.revision)
              return sendError(
                response,
                409,
                "Programmet er endret et annet sted. Last inn på nytt.",
              );
            if (!stored && body.revision !== 0)
              return sendError(
                response,
                409,
                "Programmet finnes ikke lenger på serveren.",
              );
            const saved = {
              ...clean,
              revision: body.revision + 1,
              updatedAt: new Date().toISOString(),
            };
            putProgramme(database, {
              userId,
              id,
              revision: saved.revision,
              updatedAt: saved.updatedAt,
              payload: JSON.stringify(saved),
            });
            return send(response, 200, {
              programme: { ...saved, shareToken: stored?.share_token || null },
            });
          }
          if (method === "DELETE") {
            const revision = Number(url.searchParams.get("revision"));
            const stored = findProgramme(database, userId, id);
            if (!stored || stored.revision !== revision)
              return sendError(
                response,
                409,
                "Programmet er endret et annet sted. Last inn på nytt.",
              );
            removeProgramme(database, userId, id);
            return send(response, 204, {});
          }
        }

        return sendError(response, 404, "Ukjent endepunkt.");
      }

      if (method === "GET") {
        if (serveStatic(request, response, pathname)) return;
        const index = join(config.distDir, "index.html");
        if (existsSync(index)) {
          response.writeHead(200, {
            "Content-Type": contentTypes[".html"],
            ...securityHeaders,
          });
          createReadStream(index).pipe(response);
          return;
        }
        return sendError(
          response,
          404,
          "Bygget finnes ikke. Kjør «npm run build», eller bruk utviklingsserveren.",
        );
      }

      return sendError(response, 404, "Ukjent endepunkt.");
    } catch (error) {
      const status = error?.status || 500;
      if (status >= 500) console.error(error);
      return sendError(
        response,
        status,
        // Interne feil skal ikke lekke detaljer til nettleseren.
        status >= 500
          ? "Noe gikk galt på serveren. Prøv igjen."
          : error instanceof Error
            ? error.message
            : "Ukjent feil.",
      );
    }
  };
}
