import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";

/**
 * Tar et konsistent bilde av databasen mens serveren kjører.
 * Bruk: node deploy/backup.mjs [mål-mappe]
 */
const dataDir = process.env.FORM_DATA_DIR || resolve("server", "data");
const target = resolve(process.argv[2] || "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
const destination = resolve(target, `form-${stamp}.db`);

mkdirSync(target, { recursive: true });

const database = new DatabaseSync(resolve(dataDir, "form.db"));
await backup(database, destination);
database.close();

console.log(`Sikkerhetskopi skrevet: ${destination}`);
console.log(
  "Media (public/media og public/exercises) bør sikkerhetskopieres sammen med prosjektmappen.",
);
