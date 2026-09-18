import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { config, rootDir } from "./config.mjs";
import { openDatabase } from "./db.mjs";
import { hashPassword, normalizeEmail } from "./auth.mjs";
import { findUserByEmail, logEvent } from "./db.mjs";

/**
 * Setter nytt passord lokalt på maskinen. Brukes når noen har glemt passordet
 * sitt, siden appen ikke har e-postutsending ennå.
 *
 *   node server/reset-password.mjs epost@klinikk.no
 */
const email = normalizeEmail(process.argv[2] || process.env.FORM_RESET_EMAIL);
if (!email) {
  console.error(
    "Bruk: node server/reset-password.mjs epost@klinikk.no\n" +
      "Passordet leses fra FORM_RESET_PASSWORD, ellers blir du spurt.",
  );
  process.exit(1);
}

const database = openDatabase(
  process.env.FORM_DATA_DIR || resolve(rootDir, "server", "data"),
);
const user = findUserByEmail(database, email);
if (!user) {
  console.error(`Fant ingen konto med ${email}.`);
  database.close();
  process.exit(1);
}

let password = process.env.FORM_RESET_PASSWORD || "";
if (!password) {
  const prompt = createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  password = (await prompt.question(`Nytt passord for ${email}: `)).trim();
  prompt.close();
}
if (password.length < config.minPasswordLength) {
  console.error(`Passordet må ha minst ${config.minPasswordLength} tegn.`);
  database.close();
  process.exit(1);
}

const { hash, salt } = hashPassword(password);
database
  .prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?")
  .run(hash, salt, user.id);
database.prepare("DELETE FROM sessions WHERE user_id = ?").run(user.id);
logEvent(database, { userId: user.id, kind: "password.reset" });
database.close();

console.log(
  `Passordet er oppdatert for ${email}. Alle innloggede økter er avsluttet.`,
);
