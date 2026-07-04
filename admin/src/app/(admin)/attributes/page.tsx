"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import type { AttributeDefinition } from "@/types/catalog";

export default function AttributesListPage() {
  const { tableProps } = useTable<AttributeDefinition>({ resource: "attributes", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No attributes yet" /> }}
      >
        <Table.Column<AttributeDefinition> title="Code" dataIndex="code" />
        <Table.Column<AttributeDefinition> title="Label" dataIndex="label" />
        <Table.Column<AttributeDefinition> title="Type" dataIndex="type" render={(v) => <Tag>{v}</Tag>} />
        <Table.Column<AttributeDefinition> title="Unit" dataIndex="unit" render={(v) => v ?? "—"} />
        <Table.Column<AttributeDefinition>
          title="Filterable"
          dataIndex="filterable"
          render={(v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>)}
        />
        <Table.Column<AttributeDefinition> title="Used by" render={(_, r) => `${r._count?.categories ?? 0} categories`} />
        <Table.Column<AttributeDefinition>
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
