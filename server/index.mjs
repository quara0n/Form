import { createServer } from "node:http";
import { createApp } from "./app.mjs";
import { config, lanAddress, publicBase } from "./config.mjs";
import { openDatabase } from "./db.mjs";
import { transcriptionReady, transcriptionModel } from "./transcribe.mjs";

const database = openDatabase(config.dataDir);
const server = createServer(createApp({ database }));

server.listen(config.port, config.host, () => {
  const address = `http://${config.host}:${config.port}`;
  console.log(`Form API lytter på ${address}`);
  console.log(`Database: ${config.dataDir}`);
  const lan = lanAddress();
  if (lan)
    console.log(
      `Pasientlenker bygges som ${config.publicUrl || `http://${lan}:${config.port}`} — bruk denne adressen i QR-koden.`,
    );
  console.log(
    transcriptionReady()
      ? `Tale-til-tekst: ${transcriptionModel()} (nøkkel funnet)`
      : "Tale-til-tekst: ingen OPENAI_API_KEY funnet i .env.openai ennå",
  );
});

function shutdown() {
  server.close(() => {
    database.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
