import React from "react";
import ReactDOM from "react-dom/client";
import "./styles/globals.css";
import { App } from "./App.js";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("Root element not found");
ReactDOM.createRoot(rootEl).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
