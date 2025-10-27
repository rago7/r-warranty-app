import { setupWorker } from "msw/browser";
import { authHandlers } from "./handlers/authHandlers";
import { receiptHandlers } from "./handlers/receiptHandlers";
import { dashboardHandlers } from "./handlers/dashboardHandlers";
import {profileHandlers} from "./handlers/profileHandlers"; // NEW

export const worker = setupWorker(
    ...authHandlers,
    ...receiptHandlers,
    ...dashboardHandlers,
    ...profileHandlers,
);