import { setupWorker } from "msw/browser";
import { authHandlers } from "./handlers/authHandlers";
import { receiptHandlers } from "./handlers/receiptHandlers";


export const worker = setupWorker(
    ...authHandlers,
    ...receiptHandlers,
);