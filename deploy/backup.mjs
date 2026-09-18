import { createCipheriv, randomBytes, scryptSync } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { DatabaseSync, backup } from "node:sqlite";

/**
 * Tar et konsistent bilde av databasen mens serveren kjører.
 * Bruk: node deploy/backup.mjs [mål-mappe]
 */
const dataDir = process.env.FORM_DATA_DIR || resolve("server", "data");
const target = resolve(process.argv[2] || "backups");
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 16);
const passphrase = process.env.FORM_BACKUP_PASSPHRASE || "";
const destination = resolve(target, `form-${stamp}.db`);

mkdirSync(target, { recursive: true });

const database = new DatabaseSync(resolve(dataDir, "form.db"));
await backup(database, destination);
database.close();

if (passphrase) {
  // Kryptert kopi kan trygt legges på en ekstern disk eller i skyen.
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = scryptSync(passphrase, salt, 32);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(readFileSync(destination)),
    cipher.final(),
  ]);
  const file = `${destination}.enc`;
  writeFileSync(
    file,
    Buffer.concat([salt, iv, cipher.getAuthTag(), encrypted]),
  );
  rmSync(destination);
  console.log(`Kryptert sikkerhetskopi skrevet: ${file}`);
} else {
  console.log(`Sikkerhetskopi skrevet: ${destination}`);
  console.log(
    "Tips: sett FORM_BACKUP_PASSPHRASE i deploy/.env.local for kryptert kopi.",
  );
}
console.log(
  "Media (public/media og public/exercises) bør sikkerhetskopieres sammen med prosjektmappen.",
);
