"use client";

import { useMemo, useState } from "react";
import { List, useTable, ShowButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag, Tabs, Badge, Button, App } from "antd";
import { formatAed } from "@/lib/money";
import type { Order, OrderStatus } from "@/types/orders";
import { createOrderActions, type WeighLine } from "@/lib/order-actions";
import { OrderReasonModal } from "@/components/order-reason-modal";
import { WeighOrderModal } from "@/components/weigh-order-modal";

const STATUS_COLORS: Record<OrderStatus, string> = {
  PLACED: "blue",
  ACCEPTED: "cyan",
  REJECTED: "red",
  PROCESSING: "geekblue",
  WEIGHING: "geekblue",
  AWAITING_APPROVAL: "orange",
  AWAITING_PAYMENT: "orange",
  PAID: "purple",
  OUT_FOR_DELIVERY: "gold",
  DELIVERED: "green",
  DELIVERY_FAILED: "red",
  CANCELLED: "default",
};

// Action-oriented queues — a shop floor thinks in "what needs to happen
// next", not a status column to scan. Each tab only ever shows orders that
// need one specific thing done to them right now.
type TabKey = "new" | "preparing" | "awaiting-payment" | "delivery" | "completed" | "issues";

const TAB_STATUSES: Record<TabKey, OrderStatus[]> = {
  new: ["PLACED"],
  preparing: ["ACCEPTED", "PROCESSING"],
  "awaiting-payment": ["AWAITING_PAYMENT"],
  delivery: ["PAID", "OUT_FOR_DELIVERY"],
  completed: ["DELIVERED"],
  issues: ["REJECTED", "CANCELLED", "DELIVERY_FAILED"],
};

const TAB_LABELS: Record<TabKey, string> = {
  new: "New",
  preparing: "Preparing",
  "awaiting-payment": "Awaiting Payment",
  delivery: "Delivery",
  completed: "Completed",
  issues: "Issues",
};

const TAB_ORDER: TabKey[] = ["new", "preparing", "awaiting-payment", "delivery", "completed", "issues"];

type ReasonKind = "reject" | "delivery-failed";

const REASON_MODAL_CONFIG: Record<ReasonKind, { title: string; okText: string }> = {
  reject: { title: "Reject this order?", okText: "Reject order" },
  "delivery-failed": { title: "Mark delivery as failed?", okText: "Mark failed" },
};

export default function OrdersListPage() {
  const { message } = App.useApp();
  const { tableProps, tableQuery } = useTable<Order>({ resource: "orders", pagination: { mode: "off" } });
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [reasonModal, setReasonModal] = useState<{ order: Order; kind: ReasonKind } | null>(null);
  const [weighOrder, setWeighOrder] = useState<Order | null>(null);

  const allOrders = useMemo(() => tableProps.dataSource ?? [], [tableProps.dataSource]);

  const grouped = useMemo(() => {
    const byOldestFirst = (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    const result = {} as Record<TabKey, Order[]>;
    for (const key of TAB_ORDER) {
      result[key] = allOrders.filter((o) => TAB_STATUSES[key].includes(o.status)).sort(byOldestFirst);
    }
    return result;
  }, [allOrders]);

  function actionsFor(order: Order) {
    return createOrderActions(order.id, {
      message,
      onSuccess: () => {
        setReasonModal(null);
        setWeighOrder(null);
        tableQuery.refetch();
      },
    });
  }

  async function withLoading(orderId: string, thunk: () => Promise<void>) {
    setActioningId(orderId);
    try {
      await thunk();
    } finally {
      setActioningId(null);
    }
  }

  function renderQuickActions(record: Order) {
    const loading = actioningId === record.id;
    const act = () => actionsFor(record);

    switch (record.status) {
      case "PLACED":
        return (
          <Space>
            <Button size="small" type="primary" loading={loading} onClick={() => withLoading(record.id, act().accept)}>
              Accept
            </Button>
            <Button size="small" danger onClick={() => setReasonModal({ order: record, kind: "reject" })}>
              Reject
            </Button>
          </Space>
        );
      case "ACCEPTED":
        return (
          <Button size="small" type="primary" loading={loading} onClick={() => withLoading(record.id, act().startProcessing)}>
            Start Processing
          </Button>
        );
      case "PROCESSING": {
        const hasWeightLines = record.items.some((item) => item.basePriceFils != null);
        return hasWeightLines ? (
          <Button size="small" type="primary" onClick={() => setWeighOrder(record)}>
            Record Weights
          </Button>
        ) : (
          <Button size="small" type="primary" loading={loading} onClick={() => withLoading(record.id, () => act().weigh([]))}>
            Confirm Processed
          </Button>
        );
      }
      case "AWAITING_PAYMENT":
        return (
          <Button size="small" type="primary" loading={loading} onClick={() => withLoading(record.id, act().markPaid)}>
            Mark Paid
          </Button>
        );
      case "PAID":
        return (
          <Button size="small" type="primary" loading={loading} onClick={() => withLoading(record.id, act().dispatch)}>
            Dispatch
          </Button>
        );
      case "OUT_FOR_DELIVERY":
        return (
          <Space>
            <Button size="small" type="primary" loading={loading} onClick={() => withLoading(record.id, act().deliver)}>
              Mark Delivered
            </Button>
            <Button size="small" danger onClick={() => setReasonModal({ order: record, kind: "delivery-failed" })}>
              Mark Failed
            </Button>
          </Space>
        );
      default:
        return null;
    }
  }

  function columnsFor(tab: TabKey) {
    return (
      <>
        <Table.Column<Order> title="Order" render={(_, r) => <Tag>{r.id.slice(-8)}</Tag>} />
        <Table.Column<Order> title="Customer" render={(_, r) => r.customer?.name ?? r.customerId} />
        <Table.Column<Order> title="Items" render={(_, r) => r.items.length} />
        <Table.Column<Order> title="Total" render={(_, r) => formatAed(r.finalTotalFils ?? r.totalFils)} />
        <Table.Column<Order>
          title="Status"
          render={(_, r) => <Tag color={STATUS_COLORS[r.status]}>{r.status}</Tag>}
        />
        <Table.Column<Order> title="Placed" render={(_, r) => new Date(r.createdAt).toLocaleString()} />
        {tab === "issues" && (
          <Table.Column<Order>
            title="Reason"
            render={(_, r) => r.history?.slice(-1)[0]?.reason ?? "—"}
          />
        )}
        <Table.Column<Order>
          title="Actions"
          fixed="right"
          render={(_, record) => (
            <Space>
              {renderQuickActions(record)}
              <ShowButton size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </>
    );
  }

  const activeOrder = reasonModal?.order ?? null;

  return (
    <List title="Orders">
      <Tabs
        activeKey={activeTab}
        onChange={(key) => setActiveTab(key as TabKey)}
        items={TAB_ORDER.map((key) => ({
          key,
          label: (
            <Badge count={grouped[key].length} showZero color={key === "issues" ? "red" : undefined} offset={[8, -2]}>
              <span style={{ paddingRight: 8 }}>{TAB_LABELS[key]}</span>
            </Badge>
          ),
          children: (
            <Table<Order>
              dataSource={grouped[key]}
              rowKey="id"
              size="middle"
              loading={tableProps.loading}
              pagination={false}
              locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nothing here" /> }}
            >
              {columnsFor(key)}
            </Table>
          ),
        }))}
      />

      <OrderReasonModal
        open={reasonModal != null}
        title={reasonModal ? REASON_MODAL_CONFIG[reasonModal.kind].title : ""}
        okText={reasonModal ? REASON_MODAL_CONFIG[reasonModal.kind].okText : undefined}
        confirmLoading={activeOrder != null && actioningId === activeOrder.id}
        onCancel={() => setReasonModal(null)}
        onSubmit={(reason) => {
          if (!activeOrder || !reasonModal) return;
          const action = reasonModal.kind === "reject" ? actionsFor(activeOrder).reject : actionsFor(activeOrder).deliveryFailed;
          withLoading(activeOrder.id, () => action(reason));
        }}
      />

      <WeighOrderModal
        order={weighOrder}
        open={weighOrder != null}
        confirmLoading={weighOrder != null && actioningId === weighOrder.id}
        onCancel={() => setWeighOrder(null)}
        onSubmit={(items: WeighLine[]) => {
          if (!weighOrder) return;
          withLoading(weighOrder.id, () => actionsFor(weighOrder).weigh(items));
        }}
      />
    </List>
  );
}
