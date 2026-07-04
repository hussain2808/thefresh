"use client";

import { useMemo, useState } from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Switch, InputNumber, Space, Input, Select, Button, App, Tag, Typography } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { apiFetch } from "@/lib/api-client";
import { toAed, toFils } from "@/lib/money";
import { SELLING_TYPE_COLORS, type StoreListing } from "@/types/catalog";

export default function AssortmentPage() {
  const { message } = App.useApp();
  const { tableProps, tableQuery } = useTable<StoreListing>({
    resource: "listings",
    pagination: { mode: "off" },
  });
  const [search, setSearch] = useState("");
  const [enabledFilter, setEnabledFilter] = useState<string | undefined>();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, number>>({});

  const dataSource = useMemo(() => {
    let all = (tableProps.dataSource ?? []) as StoreListing[];
    if (enabledFilter) all = all.filter((l) => String(l.enabled) === enabledFilter);
    if (search.trim()) {
      const needle = search.trim().toLowerCase();
      all = all.filter(
        (l) =>
          l.variant?.family.name.toLowerCase().includes(needle) ||
          l.variant?.sku.toLowerCase().includes(needle),
      );
    }
    return all;
  }, [tableProps.dataSource, search, enabledFilter]);

  async function toggleEnabled(listing: StoreListing, enabled: boolean) {
    await apiFetch(`/admin/listings/${listing.id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
    tableQuery.refetch();
  }

  async function savePrice(listing: StoreListing) {
    const priceAed = drafts[listing.id];
    if (priceAed === undefined) return;
    await apiFetch(`/admin/listings/${listing.id}`, {
      method: "PATCH",
      body: JSON.stringify({ priceFils: toFils(priceAed) }),
    });
    message.success("Price updated");
    tableQuery.refetch();
  }

  async function bulkSetEnabled(enabled: boolean) {
    await apiFetch("/admin/listings/bulk", {
      method: "PATCH",
      body: JSON.stringify({ items: selectedIds.map((id) => ({ id, enabled })) }),
    });
    message.success(`${selectedIds.length} listings updated`);
    setSelectedIds([]);
    tableQuery.refetch();
  }

  return (
    <List title="Assortment & Pricing">
      <Space style={{ marginBottom: 16 }} wrap>
        <Input
          allowClear
          placeholder="Search by product or SKU"
          prefix={<SearchOutlined style={{ color: "#9CA3AF" }} />}
          style={{ width: 280 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Select
          allowClear
          placeholder="Enabled?"
          style={{ width: 140 }}
          value={enabledFilter}
          onChange={setEnabledFilter}
          options={[
            { label: "Enabled", value: "true" },
            { label: "Disabled", value: "false" },
          ]}
        />
        {selectedIds.length > 0 && (
          <>
            <Typography.Text>{selectedIds.length} selected</Typography.Text>
            <Button size="small" onClick={() => bulkSetEnabled(true)}>
              Enable
            </Button>
            <Button size="small" onClick={() => bulkSetEnabled(false)}>
              Disable
            </Button>
          </>
        )}
      </Space>

      <Table
        {...tableProps}
        dataSource={dataSource}
        rowKey="id"
        size="middle"
        sticky
        rowSelection={{ selectedRowKeys: selectedIds, onChange: (keys) => setSelectedIds(keys as string[]) }}
      >
        <Table.Column<StoreListing> title="Product" render={(_, r) => r.variant?.family.name} />
        <Table.Column<StoreListing> title="Variant" render={(_, r) => `${r.variant?.name} (${r.variant?.sku})`} />
        <Table.Column<StoreListing>
          title="Type"
          render={(_, r) =>
            r.variant && <Tag color={SELLING_TYPE_COLORS[r.variant.sellingType]}>{r.variant.sellingType}</Tag>
          }
        />
        <Table.Column<StoreListing>
          title="Price"
          render={(_, r) => (
            <Space>
              <InputNumber
                min={0}
                step={0.01}
                value={drafts[r.id] ?? toAed(r.priceFils)}
                onChange={(v) => setDrafts((d) => ({ ...d, [r.id]: v ?? 0 }))}
                style={{ width: 110 }}
              />
              <Button size="small" onClick={() => savePrice(r)}>
                Save
              </Button>
            </Space>
          )}
        />
        <Table.Column<StoreListing>
          title="Stock"
          render={(_, r) => {
            const available = r.onHandQty - r.reservedQty;
            const low = available <= r.lowStockThreshold;
            return (
              <span style={{ color: low ? "#cf1322" : undefined }}>
                {available}
                {r.variant?.sellingType === "WEIGHT" ? "g" : ""} {low && <Tag color="red">Low</Tag>}
              </span>
            );
          }}
        />
        <Table.Column<StoreListing>
          title="Enabled"
          dataIndex="enabled"
          render={(v: boolean, r) => <Switch checked={v} onChange={(checked) => toggleEnabled(r, checked)} />}
        />
      </Table>
    </List>
  );
}
