import { createDecipheriv, scryptSync } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Pakker ut en sikkerhetskopi slik at den kan åpnes igjen.
 *
 *   node deploy/restore.mjs backups\form-2026-09-18T09-08.db.enc gjenopprettet.db
 *
 * Passordet hentes fra FORM_BACKUP_PASSPHRASE.
 */
const source = process.argv[2];
const destination = process.argv[3] || "gjenopprettet.db";
const passphrase = process.env.FORM_BACKUP_PASSPHRASE || "";

if (!source) {
  console.error(
    "Bruk: node deploy/restore.mjs <fil.db.enc> [målfil]\n" +
      "Passordet leses fra FORM_BACKUP_PASSPHRASE.",
  );
  process.exit(1);
}

const file = resolve(source);
if (file.endsWith(".enc")) {
  if (!passphrase) {
    console.error(
      "Sett FORM_BACKUP_PASSPHRASE for å pakke ut en kryptert kopi.",
    );
    process.exit(1);
  }
  const raw = readFileSync(file);
  const salt = raw.subarray(0, 16);
  const iv = raw.subarray(16, 28);
  const tag = raw.subarray(28, 44);
  const decipher = createDecipheriv(
    "aes-256-gcm",
    scryptSync(passphrase, salt, 32),
    iv,
  );
  decipher.setAuthTag(tag);
  const clear = Buffer.concat([
    decipher.update(raw.subarray(44)),
    decipher.final(),
  ]);
  writeFileSync(resolve(destination), clear);
  console.log(`Pakket ut til ${resolve(destination)}`);
} else {
  writeFileSync(resolve(destination), readFileSync(file));
  console.log(`Kopierte ${file} til ${resolve(destination)}`);
}
