"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import { formatAed } from "@/lib/money";
import type { DeliveryMethod } from "@/types/delivery";

export default function DeliveryMethodsListPage() {
  const { tableProps } = useTable<DeliveryMethod>({ resource: "delivery-methods", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No delivery methods yet" /> }}
      >
        <Table.Column<DeliveryMethod> title="Name" dataIndex="name" />
        <Table.Column<DeliveryMethod> title="Code" dataIndex="code" render={(v) => <Tag>{v}</Tag>} />
        <Table.Column<DeliveryMethod> title="Fee" render={(_, r) => formatAed(r.feeFils)} />
        <Table.Column<DeliveryMethod> title="Min order" render={(_, r) => formatAed(r.minimumOrderAmountFils)} />
        <Table.Column<DeliveryMethod>
          title="Free above"
          render={(_, r) => (r.freeDeliveryAboveFils ? formatAed(r.freeDeliveryAboveFils) : "—")}
        />
        <Table.Column<DeliveryMethod>
          title="ETA"
          render={(_, r) => (r.estimatedDeliveryMinutes ? `${r.estimatedDeliveryMinutes} min` : "Slot-based")}
        />
        <Table.Column<DeliveryMethod>
          title="Zones"
          render={(_, r) => (r.zones?.length ? r.zones.map((z) => z.zone?.name).join(", ") : <Tag color="green">Everywhere</Tag>)}
        />
        <Table.Column<DeliveryMethod>
          title="Active"
          dataIndex="active"
          render={(v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>)}
        />
        <Table.Column<DeliveryMethod>
          title="Actions"
          fixed="right"
          width={140}
          render={(_, record) => (
            <Space>
              <EditButton size="small" recordItemId={record.id} />
              <DeleteButton size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
