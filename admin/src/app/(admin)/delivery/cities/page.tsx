"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import type { City } from "@/types/delivery";

export default function CitiesListPage() {
  const { tableProps } = useTable<City>({ resource: "cities", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="id"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No cities yet" /> }}
      >
        <Table.Column<City> title="Name" dataIndex="name" />
        <Table.Column<City> title="Country" render={(_, r) => r.country?.name ?? "—"} />
        <Table.Column<City> title="Zones" render={(_, r) => r._count?.zones ?? 0} />
        <Table.Column<City>
          title="Active"
          dataIndex="active"
          render={(v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>)}
        />
        <Table.Column<City>
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
