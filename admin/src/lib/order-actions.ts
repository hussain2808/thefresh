import type { MessageInstance } from "antd/es/message/interface";
import { apiFetch, ApiError } from "@/lib/api-client";

export interface WeighLine {
  orderItemId: string;
  actualWeightGrams: number;
}

// Every order-lifecycle mutation lives here so the orders list (inline
// quick actions) and the order detail page (header actions) share one
// implementation instead of duplicating the apiFetch calls twice.
export function createOrderActions(
  orderId: string,
  opts: { message: MessageInstance; onSuccess: () => void },
) {
  async function run(path: string, body: unknown, successMessage: string) {
    try {
      await apiFetch(`/admin/orders/${orderId}${path}`, {
        method: "POST",
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });
      opts.message.success(successMessage);
      opts.onSuccess();
    } catch (error) {
      opts.message.error(error instanceof ApiError ? error.message : "Action failed");
    }
  }

  return {
    accept: () => run("/accept", undefined, "Order accepted"),
    reject: (reason?: string) => run("/reject", { reason }, "Order rejected"),
    startProcessing: () => run("/start-processing", undefined, "Order moved to processing"),
    weigh: (items: WeighLine[]) => run("/weigh", { items }, "Weights recorded — order recalculated"),
    markPaid: () => run("/mark-paid", undefined, "Marked as paid"),
    dispatch: () => run("/dispatch", undefined, "Marked out for delivery"),
    deliver: () => run("/deliver", undefined, "Marked delivered"),
    deliveryFailed: (reason?: string) => run("/delivery-failed", { reason }, "Marked delivery failed"),
    cancel: (reason?: string) => run("/cancel", { reason }, "Order cancelled"),
  };
}
