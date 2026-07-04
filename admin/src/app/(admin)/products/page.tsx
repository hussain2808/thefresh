"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { List, useTable, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Tag, Space, Input, Empty, Typography, Select, Button } from "antd";
import { SearchOutlined, EditOutlined } from "@ant-design/icons";
import { SELLING_TYPE_COLORS, STATUS_COLORS, type ProductFamily } from "@/types/catalog";

export default function ProductsListPage() {
  const { tableProps } = useTable<ProductFamily>({
    resource: "products",
    pagination: { mode: "off" },
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | undefined>();

  const dataSource = useMemo(() => {
    let all = (tableProps.dataSource ?? []) as ProductFamily[];
    if (statusFilter) all = all.filter((f) => f.status === statusFilter);
    if (!search.trim()) return all;
    const needle = search.trim().toLowerCase();
    return all.filter(
      (f) =>
        f.name.toLowerCase().includes(needle) ||
        f.category?.name.toLowerCase().includes(needle) ||
        f.variants.some((v) => v.sku.toLowerCase().includes(needle)),
    );
  }, [tableProps.dataSource, search, statusFilter]);

  return (
    <List headerButtons={<CreateButton>New product</CreateButton>}>
      <Space style={{ marginBottom: 16 }}>
        <Input
          allowClear
          placeholder="Search by name, category, or SKU"
          prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
          style={{ width: 320 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          allowClear
          placeholder="Status"
          style={{ width: 140 }}
          value={statusFilter}
          onChange={setStatusFilter}
          options={["DRAFT", "ACTIVE", "ARCHIVED"].map((v) => ({ label: v, value: v }))}
        />
        <Typography.Text type="secondary">
          {dataSource.length} of {tableProps.dataSource?.length ?? 0} products
        </Typography.Text>
      </Space>

      <Table
        {...tableProps}
        dataSource={dataSource}
        rowKey="id"
        size="middle"
        sticky
        locale={{
          emptyText: (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={search ? "No products match your search" : "No products yet"}
            />
          ),
        }}
      >
        <Table.Column<ProductFamily>
          title="Name"
          dataIndex="name"
          render={(_, record) => (
            <Link href={`/products/${record.id}/edit`} style={{ fontWeight: 500 }}>
              {record.name}
            </Link>
          )}
        />
        <Table.Column<ProductFamily> title="Category" render={(_, r) => r.category?.name ?? "—"} />
        <Table.Column<ProductFamily> title="Brand" render={(_, r) => r.brand?.name ?? "—"} />
        <Table.Column<ProductFamily>
          title="Selling type"
          render={(_, r) => (
            <Space size={4} wrap>
              {[...new Set(r.variants.map((v) => v.sellingType))].map((t) => (
                <Tag key={t} color={SELLING_TYPE_COLORS[t]}>
                  {t}
                </Tag>
              ))}
            </Space>
          )}
        />
        <Table.Column<ProductFamily> title="Variants" render={(_, r) => r.variants.length} />
        <Table.Column<ProductFamily>
          title="Status"
          dataIndex="status"
          render={(value: ProductFamily["status"]) => <Tag color={STATUS_COLORS[value]}>{value}</Tag>}
        />
        <Table.Column<ProductFamily>
          title="Actions"
          fixed="right"
          width={140}
          render={(_, record) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} href={`/products/${record.id}/edit`}>
                Edit
              </Button>
              <DeleteButton size="small" resource="products" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
