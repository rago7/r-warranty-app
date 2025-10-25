import { setupWorker } from "msw/browser";
import { authHandlers } from "./handlers/authHandlers";
import { receiptHandlers } from "./handlers/receiptHandlers";
import { dashboardHandlers } from "./handlers/dashboardHandlers";
import { profileHandlers } from "./handlers/profileHandlers";
import { purchaseHandlers } from "./handlers/purchaseHandlers"; // NEW

export const worker = setupWorker(
  ...authHandlers,
  ...receiptHandlers,
  ...purchaseHandlers,
  ...dashboardHandlers,
  ...profileHandlers
);