import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ReactFlowProvider } from "reactflow"; // 👈 Importar el provider
import "./index.css";
import App from "./App.jsx";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ReactFlowProvider>
      {" "}
      {/* 👈 Envolvemos toda la app */}
      <App />
    </ReactFlowProvider>
  </StrictMode>,
);
