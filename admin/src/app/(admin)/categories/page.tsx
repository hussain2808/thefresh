"use client";

import { useMemo, useState } from "react";
import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Input, Empty, Typography, Tag } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import type { Category } from "@/types/catalog";

export default function CategoriesListPage() {
  const {
    tableProps,
  } = useTable<Category>({ resource: "categories", pagination: { mode: "off" } });
  const [search, setSearch] = useState("");

  const dataSource = useMemo(() => {
    const all = (tableProps.dataSource ?? []) as Category[];
    if (!search.trim()) return all;
    const needle = search.trim().toLowerCase();
    return all.filter((c) => c.name.toLowerCase().includes(needle));
  }, [tableProps.dataSource, search]);

  return (
    <List headerButtons={<CreateButton />}>
      <Space style={{ marginBottom: 16 }}>
        <Input
          allowClear
          placeholder="Search by name"
          prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
          style={{ width: 320 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Typography.Text type="secondary">{dataSource.length} categories</Typography.Text>
      </Space>

      <Table
        {...tableProps}
        dataSource={dataSource}
        rowKey="id"
        size="middle"
        sticky
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No categories yet" /> }}
      >
        <Table.Column<Category> title="Name" dataIndex="name" />
        <Table.Column<Category>
          title="Parent"
          render={(_, record) => record.parent?.name ?? <Tag>Top level</Tag>}
        />
        <Table.Column<Category> title="Slug" dataIndex="slug" />
        <Table.Column<Category>
          title="Products"
          render={(_, record) => record._count?.families ?? 0}
        />
        <Table.Column<Category>
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
