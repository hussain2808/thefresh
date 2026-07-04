"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import type { Country } from "@/types/delivery";

export default function CountriesListPage() {
  const { tableProps } = useTable<Country>({ resource: "countries", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No countries yet" /> }}
      >
        <Table.Column<Country> title="Name" dataIndex="name" />
        <Table.Column<Country> title="Code" dataIndex="code" />
        <Table.Column<Country> title="Cities" render={(_, r) => r._count?.cities ?? 0} />
        <Table.Column<Country>
          title="Active"
          dataIndex="active"
          render={(v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>)}
        />
        <Table.Column<Country>
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
