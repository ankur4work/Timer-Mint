import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { createRoot } from "react-dom/client";

startTransition(() => {
  document.body.innerHTML = "";

  createRoot(document).render(
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
