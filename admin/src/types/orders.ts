// Mirrors the resolved shape returned by api/src/modules/orders/orders.admin.service.ts
// — customerId/variantId are bare (no FK) in the schema; the API resolves display
// names via batched lookups, so `customer`/`coupon`/`productName` only exist here.

export type OrderStatus =
  | "PLACED"
  | "ACCEPTED"
  | "REJECTED"
  | "PROCESSING"
  | "WEIGHING"
  | "AWAITING_APPROVAL"
  | "AWAITING_PAYMENT"
  | "PAID"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "DELIVERY_FAILED"
  | "CANCELLED";

export interface OrderCustomer {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface OrderCoupon {
  code: string;
  discountAmountFils: number;
}

export interface OrderItem {
  id: string;
  orderId: string;
  variantId: string;
  storeId: string;
  quantity: number | null;
  weightGrams: number | null;
  prepOptionId: string | null;
  estimatedPriceFils: number;
  createdAt: string;
  productName?: string; // present only on the detail (findOne) response
}

export interface OrderDeliverySnapshot {
  orderId: string;
  methodName: string;
  zoneName: string;
  areaName: string;
  deliveryFeeFils: number;
  etaMinutes: number | null;
  slotDate: string | null;
  slotStart: number | null;
  slotEnd: number | null;
  deliveryAddress: string;
  createdAt: string;
}

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  subtotalFils: number;
  totalFils: number;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
  deliverySnapshot: OrderDeliverySnapshot | null;
  customer: OrderCustomer | null;
  coupon: OrderCoupon | null;
}

export function formatSlotTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
