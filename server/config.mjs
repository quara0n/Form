import { readFileSync } from "node:fs";
import { networkInterfaces } from "node:os";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
export const rootDir = resolve(here, "..");

/**
 * Nøkkelen holdes på serveren. Den leses fra miljøet eller fra .env.openai,
 * og sendes aldri til nettleseren.
 */
export function openAiKey() {
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  if (fromEnv) return fromEnv;
  try {
    const file = readFileSync(resolve(rootDir, ".env.openai"), "utf8");
    const line = file
      .split(/\r?\n/)
      .find((row) => row.startsWith("OPENAI_API_KEY="));
    return line?.slice("OPENAI_API_KEY=".length).trim() || "";
  } catch {
    return "";
  }
}

export const config = {
  host: process.env.HOST || "127.0.0.1",
  port: Number(process.env.PORT || 8787),
  /**
   * Adressen som skrives ut og legges i QR-koden. Er den ikke satt, brukes
   * maskinens nettverksadresse når noen åpner appen fra maskinen selv, slik
   * at telefonen kan skanne koden og nå fram.
   */
  publicUrl: process.env.FORM_PUBLIC_URL?.replace(/\/$/, "") || "",
  dataDir: process.env.FORM_DATA_DIR || resolve(rootDir, "server", "data"),
  distDir: resolve(rootDir, "dist"),
  sessionDays: 30,
  secureCookies: process.env.FORM_SECURE_COOKIES === "1",
  transcriptionModel: process.env.FORMTALE_MODEL || "gpt-transcribe",
  maxJsonBytes: 2 * 1024 * 1024,
  maxAudioBytes: 25 * 1024 * 1024,
  minPasswordLength: 10,
};

/** Finner maskinens adresse på det lokale nettet, med de vanligste først. */
export function lanAddress() {
  const candidates = [];
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses || []) {
      if (address.family !== "IPv4" || address.internal) continue;
      const score = address.address.startsWith("192.168.")
        ? 0
        : address.address.startsWith("10.")
          ? 1
          : /^172\.(1[6-9]|2\d|3[01])\./.test(address.address)
            ? 2
            : 3;
      candidates.push({ address: address.address, score });
    }
  }
  candidates.sort((a, b) => a.score - b.score);
  return candidates[0]?.address || "";
}

/**
 * Grunnadressen som delingslenker og QR-koder bygges fra. Åpner klinikeren
 * appen fra maskinen selv, byttes localhost ut med nettverksadressen, slik at
 * telefonen faktisk kommer fram.
 */
export function publicBase(requestUrl) {
  if (config.publicUrl) return config.publicUrl;
  const host = requestUrl.hostname;
  const local = host === "localhost" || host === "127.0.0.1" || host === "::1";
  /**
   * Nettverksadressen er bare et godt svar hvis serveren faktisk lytter på
   * nettverket. Kjører den bundet til maskinen selv, må FORM_PUBLIC_URL (for
   * eksempel en tunnel) være satt — ellers finnes det ingen adresse telefonen
   * kan bruke, og da er det ærligst å vise den forespørselen kom inn på.
   */
  const listeningOnNetwork = !["127.0.0.1", "localhost", "::1"].includes(
    config.host,
  );
  if (local && listeningOnNetwork) {
    const address = lanAddress();
    if (address) return `http://${address}:${config.port}`;
  }
  return `${requestUrl.protocol}//${requestUrl.host}`;
}
