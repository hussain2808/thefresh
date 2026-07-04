"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import type { Area } from "@/types/delivery";

export default function AreasListPage() {
  const { tableProps } = useTable<Area>({ resource: "areas", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No areas yet" /> }}
      >
        <Table.Column<Area> title="Name" dataIndex="name" />
        <Table.Column<Area> title="Zone" render={(_, r) => r.zone?.name ?? "—"} />
        <Table.Column<Area>
          title="Active"
          dataIndex="active"
          render={(v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>)}
        />
        <Table.Column<Area>
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
