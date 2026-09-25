import "@fontsource/quattrocento-sans/400.css";
import "@fontsource/quattrocento-sans/700.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./theme/theme.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const root = document.getElementById("root");
if (!root) throw new Error("Missing #root element in index.html");

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
