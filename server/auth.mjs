import {
  createHash,
  randomBytes,
  randomUUID,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import {
  createSession,
  deleteSession,
  findSession,
  findUserByEmail,
  findUserById,
} from "./db.mjs";

const keyLength = 64;
export const sessionCookie = "form_session";

export function hashPassword(password, salt = randomBytes(16).toString("hex")) {
  const hash = scryptSync(password, salt, keyLength).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password, user) {
  const expected = Buffer.from(user.password_hash, "hex");
  const actual = scryptSync(password, user.password_salt, keyLength);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

/** Normaliserer e-post slik at «A@B.no» og «a@b.no» er samme konto. */
export function normalizeEmail(email) {
  return String(email || "")
    .trim()
    .toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

export function publicUser(user) {
  return { id: user.id, email: user.email, createdAt: user.created_at };
}

export function startSession(db, userId, days) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  const expires = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
  createSession(db, {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt: expires.toISOString(),
  });
  return { token, expires };
}

export function endSession(db, token) {
  if (token) deleteSession(db, token);
}

export function readCookie(request, name) {
  const header = request.headers.cookie;
  if (!header) return "";
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

/** Slår opp innlogget bruker fra sesjonskaken, eller null. */
export function currentUser(db, request) {
  const token = readCookie(request, sessionCookie);
  if (!token) return null;
  const session = findSession(db, token);
  if (!session) return null;
  if (Date.parse(session.expires_at) < Date.now()) {
    deleteSession(db, token);
    return null;
  }
  const user = findUserById(db, session.user_id);
  return user ? { user, token } : null;
}

export function newUserId() {
  return randomUUID();
}

/** Enkel identifikator for å kunne logge hvilken klient en hendelse kom fra. */
export function clientFingerprint(request) {
  const direct = request.socket?.remoteAddress || "";
  const loopback =
    direct === "127.0.0.1" || direct === "::1" || direct === "::ffff:127.0.0.1";
  /**
   * Bak Cloudflare-tunnelen kommer alle forespørsler fra loopback. Da må vi
   * bruke Cloudflares klientadresse, ellers ville én og samme grense gjelde
   * for alle brukere samtidig. Feltet stoles bare på når trafikken faktisk
   * kommer fra maskinen selv.
   */
  const address =
    (loopback && request.headers["cf-connecting-ip"]) ||
    (!loopback && request.headers["x-forwarded-for"]) ||
    direct;
  return createHash("sha256")
    .update(String(address))
    .digest("hex")
    .slice(0, 12);
}

export function findUser(db, email) {
  return findUserByEmail(db, normalizeEmail(email));
}
