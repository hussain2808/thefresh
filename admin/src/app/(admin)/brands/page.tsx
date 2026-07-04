"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty } from "antd";
import type { Brand } from "@/types/catalog";

export default function BrandsListPage() {
  const { tableProps } = useTable<Brand>({ resource: "brands", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No brands yet" /> }}
      >
        <Table.Column<Brand> title="Name" dataIndex="name" />
        <Table.Column<Brand> title="Slug" dataIndex="slug" />
        <Table.Column<Brand> title="Products" render={(_, r) => r._count?.families ?? 0} />
        <Table.Column<Brand>
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
