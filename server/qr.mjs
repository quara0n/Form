let rendererPromise;

/**
 * QR-koden tegnes på serveren slik at papirversjonen kan lenke rett til
 * pasientvisningen. Pakken lastes først når den faktisk trengs.
 */
async function renderer() {
  rendererPromise ??= import("qrcode").then(
    (module) => module.default || module,
  );
  return rendererPromise;
}

export async function qrSvg(text) {
  const qrcode = await renderer();
  return qrcode.toString(text, {
    type: "svg",
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#22372c", light: "#ffffff" },
  });
}
