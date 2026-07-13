"use client";

import { useState } from "react";
import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import {
  Descriptions,
  Table,
  Card,
  Tag,
  Typography,
  Space,
  Row,
  Col,
  Button,
  Steps,
  Timeline,
  Alert,
  App,
} from "antd";
import { formatAed } from "@/lib/money";
import { formatSlotTime, type Order, type OrderItem, type OrderStatus } from "@/types/orders";
import { createOrderActions, type WeighLine } from "@/lib/order-actions";
import { OrderReasonModal } from "@/components/order-reason-modal";
import { WeighOrderModal } from "@/components/weigh-order-modal";

// The happy path only — WEIGHING is folded into "Processing & Weighing"
// since the backend never leaves an order resting there (it's a single
// transaction: PROCESSING -> WEIGHING -> AWAITING_PAYMENT).
const HAPPY_PATH: OrderStatus[] = [
  "PLACED",
  "ACCEPTED",
  "PROCESSING",
  "AWAITING_PAYMENT",
  "PAID",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
];

const STEP_LABELS: Partial<Record<OrderStatus, string>> = {
  PLACED: "Placed",
  ACCEPTED: "Accepted",
  PROCESSING: "Processing & Weighing",
  AWAITING_PAYMENT: "Awaiting Payment",
  PAID: "Paid",
  OUT_FOR_DELIVERY: "Out for Delivery",
  DELIVERED: "Delivered",
};

const TERMINAL_STATUSES: OrderStatus[] = ["REJECTED", "CANCELLED", "DELIVERY_FAILED"];

type ReasonKind = "reject" | "cancel" | "delivery-failed";

const REASON_MODAL_CONFIG: Record<ReasonKind, { title: string; okText: string }> = {
  reject: { title: "Reject this order?", okText: "Reject order" },
  cancel: { title: "Cancel this order?", okText: "Cancel order" },
  "delivery-failed": { title: "Mark delivery as failed?", okText: "Mark failed" },
};

function journeyProgress(order: Order): { current: number; status: "process" | "error" | "finish" } {
  if (order.status === "DELIVERED") return { current: HAPPY_PATH.length - 1, status: "finish" };
  if (TERMINAL_STATUSES.includes(order.status)) {
    const lastFrom = order.history?.slice(-1)[0]?.from;
    const idx = lastFrom ? HAPPY_PATH.indexOf(lastFrom) : 0;
    return { current: idx === -1 ? 0 : idx, status: "error" };
  }
  const effectiveStatus = order.status === "WEIGHING" ? "PROCESSING" : order.status;
  const idx = HAPPY_PATH.indexOf(effectiveStatus);
  return { current: idx === -1 ? 0 : idx, status: "process" };
}

export default function OrderShowPage() {
  const { message } = App.useApp();
  const { query } = useShow<Order>({ resource: "orders" });
  const order = query?.data?.data;

  const [actionLoading, setActionLoading] = useState(false);
  const [weighOpen, setWeighOpen] = useState(false);
  const [reasonKind, setReasonKind] = useState<ReasonKind | null>(null);

  if (!order) {
    return <Show isLoading={query?.isLoading} title="Order" />;
  }

  const actions = createOrderActions(order.id, {
    message,
    onSuccess: () => {
      setWeighOpen(false);
      setReasonKind(null);
      query.refetch();
    },
  });

  async function runAction(thunk: () => Promise<void>) {
    setActionLoading(true);
    try {
      await thunk();
    } finally {
      setActionLoading(false);
    }
  }

  const weightLines = order.items.filter((i) => i.basePriceFils != null);
  const { current, status: stepStatus } = journeyProgress(order);
  const lastHistoryReason = order.history?.slice(-1)[0]?.reason;

  return (
    <Show
      isLoading={query?.isLoading}
      title={`Order ${order.id.slice(-8)}`}
      headerButtons={
        <Space>
          {order.status === "PLACED" && (
            <>
              <Button type="primary" loading={actionLoading} onClick={() => runAction(actions.accept)}>
                Accept
              </Button>
              <Button danger onClick={() => setReasonKind("reject")}>
                Reject
              </Button>
            </>
          )}
          {order.status === "ACCEPTED" && (
            <>
              <Button type="primary" loading={actionLoading} onClick={() => runAction(actions.startProcessing)}>
                Start Processing
              </Button>
              <Button onClick={() => setReasonKind("cancel")}>Cancel</Button>
            </>
          )}
          {order.status === "PROCESSING" &&
            (weightLines.length > 0 ? (
              <Button type="primary" onClick={() => setWeighOpen(true)}>
                Record weights
              </Button>
            ) : (
              <Button type="primary" loading={actionLoading} onClick={() => runAction(() => actions.weigh([]))}>
                Confirm processed
              </Button>
            ))}
          {order.status === "AWAITING_PAYMENT" && (
            <>
              <Button type="primary" loading={actionLoading} onClick={() => runAction(actions.markPaid)}>
                Mark Paid
              </Button>
              <Button onClick={() => setReasonKind("cancel")}>Cancel</Button>
            </>
          )}
          {order.status === "PAID" && (
            <Button type="primary" loading={actionLoading} onClick={() => runAction(actions.dispatch)}>
              Dispatch
            </Button>
          )}
          {order.status === "OUT_FOR_DELIVERY" && (
            <>
              <Button type="primary" loading={actionLoading} onClick={() => runAction(actions.deliver)}>
                Mark Delivered
              </Button>
              <Button danger onClick={() => setReasonKind("delivery-failed")}>
                Mark Failed
              </Button>
            </>
          )}
        </Space>
      }
    >
      <Space direction="vertical" size="large" style={{ width: "100%" }}>
        <Card size="small">
          <Steps
            current={current}
            status={stepStatus}
            items={HAPPY_PATH.map((s) => ({ title: STEP_LABELS[s] }))}
          />
          {TERMINAL_STATUSES.includes(order.status) && (
            <Alert
              style={{ marginTop: 16 }}
              type="error"
              showIcon
              message={order.status}
              description={lastHistoryReason ?? "No reason recorded"}
            />
          )}
        </Card>

        <Row gutter={16}>
          <Col span={12}>
            <Card title="Customer" size="small">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Name">{order.customer?.name ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Email">{order.customer?.email ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Phone">{order.customer?.phone ?? "—"}</Descriptions.Item>
                <Descriptions.Item label="Status">
                  <Tag>{order.status}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Placed">{new Date(order.createdAt).toLocaleString()}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
          <Col span={12}>
            <Card title="Delivery" size="small">
              {order.deliverySnapshot ? (
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Method">{order.deliverySnapshot.methodName}</Descriptions.Item>
                  <Descriptions.Item label="Zone / Area">
                    {order.deliverySnapshot.zoneName} / {order.deliverySnapshot.areaName}
                  </Descriptions.Item>
                  <Descriptions.Item label="Fee">{formatAed(order.deliverySnapshot.deliveryFeeFils)}</Descriptions.Item>
                  <Descriptions.Item label="ETA">
                    {order.deliverySnapshot.etaMinutes
                      ? `${order.deliverySnapshot.etaMinutes} min`
                      : order.deliverySnapshot.slotStart != null && order.deliverySnapshot.slotEnd != null
                        ? `${formatSlotTime(order.deliverySnapshot.slotStart)} - ${formatSlotTime(order.deliverySnapshot.slotEnd)}${
                            order.deliverySnapshot.slotDate
                              ? ` on ${new Date(order.deliverySnapshot.slotDate).toLocaleDateString()}`
                              : ""
                          }`
                        : "—"}
                  </Descriptions.Item>
                  <Descriptions.Item label="Address">{order.deliverySnapshot.deliveryAddress}</Descriptions.Item>
                </Descriptions>
              ) : (
                <Typography.Text type="secondary">No delivery snapshot</Typography.Text>
              )}
            </Card>
          </Col>
        </Row>

        <Card title="Items" size="small">
          <Table<OrderItem> dataSource={order.items} rowKey="id" pagination={false} size="small">
            <Table.Column<OrderItem> title="Product" render={(_, r) => r.productName ?? r.variantId} />
            <Table.Column<OrderItem>
              title="Requested"
              render={(_, r) => (r.weightGrams ? `${r.weightGrams}g` : (r.quantity ?? 1))}
            />
            <Table.Column<OrderItem>
              title="Actual"
              render={(_, r) => (r.actualWeightGrams != null ? `${r.actualWeightGrams}g` : "—")}
            />
            <Table.Column<OrderItem> title="Estimated Price" render={(_, r) => formatAed(r.estimatedPriceFils)} />
            <Table.Column<OrderItem>
              title="Final Price"
              render={(_, r) => (r.finalPriceFils != null ? formatAed(r.finalPriceFils) : "—")}
            />
            <Table.Column<OrderItem>
              title="Variance"
              render={(_, r) => {
                if (r.varianceBasisPoints == null) return "—";
                const pct = r.varianceBasisPoints / 100;
                return (
                  <Tag color={pct === 0 ? "default" : pct > 0 ? "orange" : "blue"}>
                    {pct > 0 ? "+" : ""}
                    {pct.toFixed(2)}%
                  </Tag>
                );
              }}
            />
          </Table>
        </Card>

        <Card title="Totals" size="small">
          <Descriptions column={1} size="small">
            <Descriptions.Item label="Subtotal">{formatAed(order.subtotalFils)}</Descriptions.Item>
            {order.coupon && (
              <Descriptions.Item label={`Coupon (${order.coupon.code})`}>
                − {formatAed(order.coupon.discountAmountFils)}
              </Descriptions.Item>
            )}
            {order.deliverySnapshot && (
              <Descriptions.Item label="Delivery fee">{formatAed(order.deliverySnapshot.deliveryFeeFils)}</Descriptions.Item>
            )}
            <Descriptions.Item label={<Typography.Text strong>Total (at checkout)</Typography.Text>}>
              <Typography.Text strong>{formatAed(order.totalFils)}</Typography.Text>
            </Descriptions.Item>
            {order.finalTotalFils != null && (
              <Descriptions.Item label={<Typography.Text strong>Final total (after weighing)</Typography.Text>}>
                <Typography.Text strong>{formatAed(order.finalTotalFils)}</Typography.Text>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>

        <Card title="History" size="small">
          {order.history && order.history.length > 0 ? (
            <Timeline
              items={order.history.map((entry) => ({
                children: (
                  <>
                    <Typography.Text strong>
                      {entry.from} → {entry.to}
                    </Typography.Text>
                    <br />
                    <Typography.Text type="secondary">
                      {new Date(entry.createdAt).toLocaleString()} · {entry.actorRole}
                    </Typography.Text>
                    {entry.reason && (
                      <>
                        <br />
                        <Typography.Text italic>&ldquo;{entry.reason}&rdquo;</Typography.Text>
                      </>
                    )}
                  </>
                ),
              }))}
            />
          ) : (
            <Typography.Text type="secondary">No status changes yet</Typography.Text>
          )}
        </Card>
      </Space>

      <OrderReasonModal
        open={reasonKind != null}
        title={reasonKind ? REASON_MODAL_CONFIG[reasonKind].title : ""}
        okText={reasonKind ? REASON_MODAL_CONFIG[reasonKind].okText : undefined}
        confirmLoading={actionLoading}
        onCancel={() => setReasonKind(null)}
        onSubmit={(reason) => {
          if (!reasonKind) return;
          const action =
            reasonKind === "reject" ? actions.reject : reasonKind === "cancel" ? actions.cancel : actions.deliveryFailed;
          runAction(() => action(reason));
        }}
      />

      <WeighOrderModal
        order={order}
        open={weighOpen}
        confirmLoading={actionLoading}
        onCancel={() => setWeighOpen(false)}
        onSubmit={(items: WeighLine[]) => runAction(() => actions.weigh(items))}
      />
    </Show>
  );
}
