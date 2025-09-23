import { setupWorker } from "msw/browser";
import { authHandlers } from "./handlers/authHandlers";
import { receiptHandlers } from "./handlers/receiptHandlers";
import { dashboardHandlers } from "./handlers/dashboardHandlers"; // NEW

export const worker = setupWorker(
    ...authHandlers,
    ...receiptHandlers,
    ...dashboardHandlers,
);