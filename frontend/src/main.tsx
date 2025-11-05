 
import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import "@fontsource-variable/inter";
import "@fontsource-variable/space-grotesk";

import App from "./pages/App";
import { ThemeProvider } from "./theme/ThemeProvider";
import { ToastProvider } from "./components/toast/ToastProvider";
import "./index.css";
import "./styles/globals.css";

const defaultTitle = "ClipNotes Monitoring";
const hiddenTitle = "ClipNotes Monitoring — Paused";

if (typeof document !== "undefined") {
  document.title = defaultTitle;

  const handleVisibilityChange = () => {
    document.title = document.hidden ? hiddenTitle : defaultTitle;
  };

  document.addEventListener("visibilitychange", handleVisibilityChange);
  window.addEventListener("focus", handleVisibilityChange);
}

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
