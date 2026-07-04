"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import type { Zone } from "@/types/delivery";

export default function ZonesListPage() {
  const { tableProps } = useTable<Zone>({ resource: "zones", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No zones yet" /> }}
      >
        <Table.Column<Zone> title="Name" dataIndex="name" />
        <Table.Column<Zone> title="City" render={(_, r) => r.city?.name ?? "—"} />
        <Table.Column<Zone> title="Areas" render={(_, r) => r._count?.areas ?? 0} />
        <Table.Column<Zone> title="Restricted methods" render={(_, r) => r._count?.methodZones ?? 0} />
        <Table.Column<Zone>
          title="Active"
          dataIndex="active"
          render={(v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>)}
        />
        <Table.Column<Zone>
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
