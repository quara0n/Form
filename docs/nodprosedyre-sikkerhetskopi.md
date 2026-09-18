# Nødprosedyre: åpne en sikkerhetskopi

Denne filen inneholder ingen hemmeligheter. Den beskriver hva du gjør hvis du
trenger å hente tilbake data, og hva nøkkelen er til.

## Hva nøkkelen er

FormRehab tar en kopi av databasen hver natt klokka 20 på klinikkmaskinen og
krypterer den med passordet i `FORM_BACKUP_PASSPHRASE`. Uten det passordet kan
kopiene ikke åpnes — heller ikke av noen andre. Passordet ligger i
`deploy/.env.local` på maskinen, og skal i tillegg oppbevares i en
passordbehandler og på papir i et låst skap.

Kopiene ligger i `C:\Users\post\FormRehab\backups` med navn som
`form-2026-09-18T09-39.db.enc`. De fjorten nyeste beholdes automatisk.

## Slik åpner du en kopi

```powershell
cd C:\Users\post\OneDrive\Dokumenter\ChatGPT\Form
$env:FORM_BACKUP_PASSPHRASE="<nøkkelen fra passordbehandleren>"
node deploy\restore.mjs "C:\Users\post\FormRehab\backups\form-2026-09-18T09-39.db.enc" gjenopprettet.db
```

Da får du en vanlig SQLite-fil du kan åpne, eller legge inn som
`FORM_DATA_DIR` for å starte appen på den. Sjekk at innholdet er der:

```powershell
node -e "const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync('gjenopprettet.db'); console.log('brukere', db.prepare('select count(*) c from users').get().c, 'programmer', db.prepare('select count(*) c from programmes').get().c);"
```

Feil passord gir meldingen «unable to authenticate data». Da er nøkkelen feil,
eller filen er skadet. Det siste er krypteringen som skal virke: den slipper
ikke inn noen med feil nøkkel.

## Hvis nøkkelen er borte

De krypterte kopiene kan ikke gjenopprettes. Databasen på maskinen virker som
før, så klinikkens data er ikke tapt — du har bare mistet muligheten til å hente
eldre øyeblikksbilder. Løsningen er å sette en ny nøkkel i `deploy/.env.local`
og ta en ny kopi med en gang.

## Har du ikke nøkkelen i det hele tatt

Den står i `deploy/.env.local` på klinikkmaskinen, på linjen
`FORM_BACKUP_PASSPHRASE=`. Kopier den derfra til passordbehandleren din med en
gang.

## Passordet beskytter ikke alt

Databasen som er i bruk på maskinen er ikke kryptert. Det er BitLocker som
beskytter den hvis maskinen blir stjålet. Sjekk med følgende i PowerShell som
administrator:

```powershell
manage-bde -status C:
```

Står det «Protection On», er disken kryptert.
