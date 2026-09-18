import { mkdtempSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { createApp } from "./app.mjs";
import { openDatabase } from "./db.mjs";

const dataDir = mkdtempSync(join(tmpdir(), "form-api-"));
const database = openDatabase(dataDir);
const transcript = [];

const server = createServer(
  createApp({
    database,
    ready: () => true,
    transcribe: async (bytes, contentType) => {
      transcript.push({ size: bytes.length, contentType });
      return { text: "brystpress 3 sett", model: "gpt-transcribe" };
    },
  }),
);

let base = "";

before(async () => {
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
  database.close();
  rmSync(dataDir, { recursive: true, force: true });
});

async function call(path, { method = "GET", body, cookie, headers } = {}) {
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const setCookie = response.headers.get("set-cookie") || "";
  const token = setCookie.split(";")[0];
  const payload =
    response.status === 204 ? null : await response.json().catch(() => null);
  return { status: response.status, body: payload, cookie: token };
}

const credentials = {
  email: "rune@gpshelse.no",
  password: "veldig-hemmelig-1",
};

function sampleProgramme(id = "p1") {
  return {
    id,
    schemaVersion: 1,
    revision: 0,
    title: "Hofteprogram",
    instructions: "",
    updatedAt: new Date().toISOString(),
    items: [],
  };
}

describe("innlogging", () => {
  let cookie = "";

  test("avviser svakt passord", async () => {
    const result = await call("/api/auth/register", {
      method: "POST",
      body: { email: "kort@test.no", password: "kort" },
    });
    assert.equal(result.status, 400);
  });

  test("avviser ugyldig e-post", async () => {
    const result = await call("/api/auth/register", {
      method: "POST",
      body: { email: "ikke-epost", password: "veldig-hemmelig-1" },
    });
    assert.equal(result.status, 400);
  });

  test("registrerer en konto og setter sesjonskake", async () => {
    const result = await call("/api/auth/register", {
      method: "POST",
      body: credentials,
    });
    assert.equal(result.status, 201);
    assert.equal(result.body.user.email, credentials.email);
    assert.match(result.cookie, /^form_session=/);
    assert.equal(result.body.user.password_hash, undefined);
    cookie = result.cookie;
  });

  test("avviser samme e-post en gang til", async () => {
    const result = await call("/api/auth/register", {
      method: "POST",
      body: credentials,
    });
    assert.equal(result.status, 409);
  });

  test("svarer med brukeren på /me", async () => {
    const result = await call("/api/auth/me", { cookie });
    assert.equal(result.status, 200);
    assert.equal(result.body.user.email, credentials.email);
  });

  test("avviser feil passord", async () => {
    const result = await call("/api/auth/login", {
      method: "POST",
      body: { ...credentials, password: "feil-passord-123" },
    });
    assert.equal(result.status, 401);
  });

  test("logger inn med riktig passord", async () => {
    const result = await call("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
    assert.equal(result.status, 200);
    cookie = result.cookie;
  });

  test("logger ut og avviser videre kall", async () => {
    const out = await call("/api/auth/logout", { method: "POST", cookie });
    assert.equal(out.status, 204);
    const me = await call("/api/auth/me", { cookie });
    assert.equal(me.status, 401);
    const login = await call("/api/auth/login", {
      method: "POST",
      body: credentials,
    });
    cookie = login.cookie;
  });

  test("krever innlogging for programmer", async () => {
    const result = await call("/api/programmes");
    assert.equal(result.status, 401);
  });

  test("lagrer, leser og versjonerer et program", async () => {
    const programme = sampleProgramme();
    const created = await call("/api/programmes/p1", {
      method: "PUT",
      body: programme,
      cookie,
    });
    assert.equal(created.status, 200);
    assert.equal(created.body.programme.revision, 1);

    const conflict = await call("/api/programmes/p1", {
      method: "PUT",
      body: programme,
      cookie,
    });
    assert.equal(conflict.status, 409);

    const list = await call("/api/programmes", { cookie });
    assert.equal(list.body.programmes.length, 1);
    assert.equal(list.body.programmes[0].title, "Hofteprogram");
  });

  test("avviser ugyldig program", async () => {
    const result = await call("/api/programmes/p2", {
      method: "PUT",
      body: { id: "p2", schemaVersion: 1 },
      cookie,
    });
    assert.equal(result.status, 400);
  });

  test("sletter bare med riktig versjon", async () => {
    const wrong = await call("/api/programmes/p1?revision=7", {
      method: "DELETE",
      cookie,
    });
    assert.equal(wrong.status, 409);
    const removed = await call("/api/programmes/p1?revision=1", {
      method: "DELETE",
      cookie,
    });
    assert.equal(removed.status, 204);
    const list = await call("/api/programmes", { cookie });
    assert.equal(list.body.programmes.length, 0);
  });

  test("holder programmer adskilt mellom brukere", async () => {
    await call("/api/programmes/felles", {
      method: "PUT",
      body: sampleProgramme("felles"),
      cookie,
    });
    const other = await call("/api/auth/register", {
      method: "POST",
      body: { email: "annen@klinikk.no", password: "et-annet-passord-2" },
    });
    const otherList = await call("/api/programmes", { cookie: other.cookie });
    assert.equal(otherList.body.programmes.length, 0);
    const steal = await call("/api/programmes/felles?revision=1", {
      method: "DELETE",
      cookie: other.cookie,
    });
    assert.equal(steal.status, 409);
    const mine = await call("/api/programmes", { cookie });
    assert.equal(mine.body.programmes.length, 1);
  });

  test("tar imot lyd og svarer med tekst", async () => {
    const ready = await call("/api/transcribe", { cookie });
    assert.equal(ready.status, 200);
    assert.equal(ready.body.ready, true);
    assert.equal(ready.body.model, "gpt-transcribe");

    const response = await fetch(`${base}/api/transcribe`, {
      method: "POST",
      headers: { "Content-Type": "audio/webm", Cookie: cookie },
      body: Buffer.from("lyd"),
    });
    const payload = await response.json();
    assert.equal(response.status, 200);
    assert.equal(payload.text, "brystpress 3 sett");
    assert.equal(transcript.length, 1);
    assert.equal(transcript[0].contentType, "audio/webm");
  });

  test("deler et program med en åpen lenke og roterer den", async () => {
    await call("/api/programmes/delt", {
      method: "PUT",
      body: sampleProgramme("delt"),
      cookie,
    });
    const share = await call("/api/programmes/delt/share", {
      method: "POST",
      cookie,
    });
    assert.equal(share.status, 200);
    assert.match(share.body.path, /^\/p\/[A-Za-z0-9_-]{16,}$/);

    const anonymous = await call(`/api/shared/${share.body.token}`);
    assert.equal(anonymous.status, 200);
    assert.equal(anonymous.body.programme.id, "delt");
    assert.equal(anonymous.body.programme.user_id, undefined);
    assert.equal(anonymous.body.programme.shareToken, undefined);

    const qr = await fetch(`${base}/api/shared/${share.body.token}/qr.svg`);
    assert.equal(qr.status, 200);
    assert.match(qr.headers.get("content-type"), /image\/svg\+xml/);
    assert.match(await qr.text(), /^<svg/);

    const rotated = await call("/api/programmes/delt/share", {
      method: "DELETE",
      cookie,
    });
    assert.equal(rotated.status, 204);
    const stale = await call(`/api/shared/${share.body.token}`);
    assert.equal(stale.status, 404);
    const again = await call("/api/programmes/delt/share", {
      method: "POST",
      cookie,
    });
    assert.notEqual(again.body.token, share.body.token);
    const fresh = await call(`/api/shared/${again.body.token}`);
    assert.equal(fresh.status, 200);
  });

  test("avviser ukjent delingslenke", async () => {
    const result = await call("/api/shared/abcdefghijklmnopqrstuvwx");
    assert.equal(result.status, 404);
  });
});
