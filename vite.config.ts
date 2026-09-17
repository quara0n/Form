import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { defineConfig, type Plugin } from "vite";
import react from "@vitejs/plugin-react";

const transcriptPrompt =
  "Norske fysioterapiøvelser: brystpress, nedtrekk til bryst, leg extension, sittende leg curl, benpress, flyes, rygghev, diagonalen, sideplanke på knærne, seteløft, knebøy, markløft, sett, reps, repetisjoner, pause, sekunder, minutter.";

function localOpenAiKey(): string {
  if (process.env.OPENAI_API_KEY?.trim())
    return process.env.OPENAI_API_KEY.trim();
  try {
    const file = readFileSync(".env.openai", "utf8");
    const line = file
      .split(/\r?\n/)
      .find((row) => row.startsWith("OPENAI_API_KEY="));
    return line?.slice("OPENAI_API_KEY=".length).trim() || "";
  } catch {
    return "";
  }
}

function send(response: ServerResponse, status: number, body: unknown): void {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(body));
}

async function readBody(request: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of request)
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
}

/**
 * Keeps the OpenAI key on the machine: the browser posts recorded audio here and
 * this dev-server middleware forwards it to Whisper. Without a key the endpoint
 * stays in place and reports 501, and the app falls back to the Web Speech API.
 */
function transcribePlugin(): Plugin {
  return {
    name: "form-transcribe",
    configureServer(server) {
      server.middlewares.use("/api/transcribe", async (request, response) => {
        if (request.method === "GET") {
          const key = localOpenAiKey();
          send(response, key ? 200 : 501, {
            ready: Boolean(key),
            error: key ? undefined : "Ingen OPENAI_API_KEY funnet lokalt.",
          });
          return;
        }
        if (request.method !== "POST") {
          send(response, 405, { error: "Bruk POST med lyd." });
          return;
        }
        const key = localOpenAiKey();
        if (!key) {
          send(response, 501, {
            error:
              "Ingen OPENAI_API_KEY funnet. Legg den i .env.openai for å bruke Whisper.",
          });
          return;
        }
        try {
          const audio = await readBody(request);
          if (!audio.length) {
            send(response, 400, { error: "Tomt lydopptak." });
            return;
          }
          const form = new FormData();
          form.append(
            "file",
            new Blob([new Uint8Array(audio)], {
              type: request.headers["content-type"] || "audio/webm",
            }),
            "tale.webm",
          );
          form.append("model", process.env.FORMTALE_MODEL || "whisper-1");
          form.append("language", "no");
          form.append("prompt", transcriptPrompt);
          const api = await fetch(
            "https://api.openai.com/v1/audio/transcriptions",
            {
              method: "POST",
              headers: { Authorization: `Bearer ${key}` },
              body: form,
            },
          );
          const payload = (await api.json()) as {
            text?: string;
            error?: { message?: string };
          };
          if (!api.ok) {
            send(response, api.status, {
              error: payload.error?.message || "Transkriberingen feilet.",
            });
            return;
          }
          send(response, 200, { text: payload.text ?? "" });
        } catch (error) {
          send(response, 500, {
            error:
              error instanceof Error
                ? error.message
                : "Ukjent feil under transkribering.",
          });
        }
      });
    },
  };
}

export default defineConfig({ plugins: [react(), transcribePlugin()] });
