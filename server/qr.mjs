import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
let qrcode;

/**
 * QR-koden tegnes på serveren slik at papirversjonen kan lenke rett til
 * pasientvisningen. qrcode er en CommonJS-pakke, så vi henter den med
 * require — import() klarer ikke å løse opp hovedfilen i alle Node-versjoner.
 */
function renderer() {
  qrcode ??= require("qrcode");
  return qrcode;
}

export async function qrSvg(text) {
  return renderer().toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#22372c", light: "#ffffff" },
  });
}
