import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/literata/400.css";
import "@fontsource/inter/400.css";
import "./styles/index.css";
import { App } from "./app/App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
