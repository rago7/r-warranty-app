import React from "react";
import { createRoot } from "react-dom/client";
import App from "./app/App.jsx";
import "./styles/globals.css";


async function enableMocking() {
    if (import.meta.env.VITE_USE_MOCKS === "true") {
        const { worker } = await import("./mocks/browser");
        await worker.start({ onUnhandledRequest: "bypass" });
    }
}


enableMocking().then(() => {
    createRoot(document.getElementById("root")).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
});