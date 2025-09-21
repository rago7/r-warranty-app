import { setupWorker } from "msw/browser";
import { authHandlers } from "./handlers/authHandlers";


export const worker = setupWorker(
    ...authHandlers,
// add more handlers here in later steps
);