import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { LandingPage } from "./LandingPage";
import { AuthGate } from "./features/auth/AuthGate";
import { PatientProgramme } from "./features/patient/PatientProgramme";
import "./styles.css";
import "./workspace-theme.css";

// Pasientlenken /p/<token> skal virke uten innlogging.
const shared = window.location.pathname.match(/^\/p\/([A-Za-z0-9_-]{16,})\/?$/);

// Pasientvisningen kan legges på hjemskjermen og virker offline etter første
// visning. Tjenestearbeideren registreres bare i bygget, ikke i utvikling.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {shared ? (
      <PatientProgramme token={shared[1]} />
    ) : /^\/app\/?$/.test(window.location.pathname) ? (
      <AuthGate>
        <App />
      </AuthGate>
    ) : (
      <LandingPage />
    )}
  </React.StrictMode>,
);
