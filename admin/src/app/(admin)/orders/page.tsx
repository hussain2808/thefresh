"use client";

import { List, useTable, ShowButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import { formatAed } from "@/lib/money";
import type { Order, OrderStatus } from "@/types/orders";

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

export default function OrdersListPage() {
  const { tableProps } = useTable<Order>({ resource: "orders", pagination: { mode: "off" } });

  return (
    <List>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No orders yet" /> }}
      >
        <Table.Column<Order> title="Order" render={(_, r) => <Tag>{r.id.slice(-8)}</Tag>} />
        <Table.Column<Order> title="Customer" render={(_, r) => r.customer?.name ?? r.customerId} />
        <Table.Column<Order> title="Items" render={(_, r) => r.items.length} />
        <Table.Column<Order> title="Delivery" render={(_, r) => r.deliverySnapshot?.methodName ?? "—"} />
        <Table.Column<Order>
          title="Coupon"
          render={(_, r) => (r.coupon ? <Tag color="blue">{r.coupon.code}</Tag> : "—")}
        />
        <Table.Column<Order> title="Total" render={(_, r) => formatAed(r.totalFils)} />
        <Table.Column<Order>
          title="Status"
          render={(_, r) => <Tag color={STATUS_COLORS[r.status]}>{r.status}</Tag>}
        />
        <Table.Column<Order>
          title="Placed"
          render={(_, r) => new Date(r.createdAt).toLocaleString()}
        />
        <Table.Column<Order>
          title="Actions"
          fixed="right"
          width={100}
          render={(_, record) => (
            <Space>
              <ShowButton size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
