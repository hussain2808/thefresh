"use client";

import { useState } from "react";
import { Table, Switch, InputNumber, Button, App, Space, Tag } from "antd";
import { apiFetch } from "@/lib/api-client";
import { toAed, toFils } from "@/lib/money";
import type { ProductFamily, StoreListing, Variant } from "@/types/catalog";

interface Row {
  variant: Variant;
  listing?: StoreListing;
}

export function FamilyPricingTab({ family, onSaved }: { family: ProductFamily; onSaved: () => void }) {
  const { message } = App.useApp();
  const [drafts, setDrafts] = useState<Record<string, { priceAed?: number; lowStockThreshold?: number }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);

  const rows: Row[] = family.variants.map((variant) => ({
    variant,
    listing: variant.listings?.[0],
  }));

  function setDraft(variantId: string, patch: Partial<{ priceAed: number; lowStockThreshold: number }>) {
    setDrafts((d) => ({ ...d, [variantId]: { ...d[variantId], ...patch } }));
  }

  async function createListing(variant: Variant) {
    setSavingId(variant.id);
    try {
      const priceAed = drafts[variant.id]?.priceAed ?? 0;
      await apiFetch("/admin/listings", {
        method: "POST",
        body: JSON.stringify({ variantId: variant.id, priceFils: toFils(priceAed), enabled: false }),
      });
      message.success("Listing created");
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to create listing");
    } finally {
      setSavingId(null);
    }
  }

  async function saveListing(listing: StoreListing) {
    setSavingId(listing.id);
    try {
      const draft = drafts[listing.variantId];
      await apiFetch(`/admin/listings/${listing.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          priceFils: draft?.priceAed !== undefined ? toFils(draft.priceAed) : undefined,
          lowStockThreshold: draft?.lowStockThreshold,
        }),
      });
      message.success("Saved");
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to save");
    } finally {
      setSavingId(null);
    }
  }

  async function toggleEnabled(listing: StoreListing, enabled: boolean) {
    try {
      await apiFetch(`/admin/listings/${listing.id}`, { method: "PATCH", body: JSON.stringify({ enabled }) });
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to update");
    }
  }

  return (
    <Table<Row>
      dataSource={rows}
      rowKey={(r) => r.variant.id}
      pagination={false}
      size="middle"
    >
      <Table.Column<Row> title="Variant" render={(_, r) => `${r.variant.name} (${r.variant.sku})`} />
      <Table.Column<Row>
        title={(): string => "Price"}
        render={(_, r) => {
          const unit = r.variant.sellingType === "WEIGHT" ? "AED/kg" : "AED";
          const current = drafts[r.variant.id]?.priceAed ?? (r.listing ? toAed(r.listing.priceFils) : undefined);
          return (
            <InputNumber
              min={0}
              step={0.01}
              addonAfter={unit}
              value={current}
              onChange={(v) => setDraft(r.variant.id, { priceAed: v ?? 0 })}
              style={{ width: 160 }}
            />
          );
        }}
      />
      <Table.Column<Row>
        title="On hand"
        render={(_, r) =>
          r.listing ? `${r.listing.onHandQty}${r.variant.sellingType === "WEIGHT" ? "g" : ""}` : "—"
        }
      />
      <Table.Column<Row>
        title="Low stock threshold"
        render={(_, r) =>
          r.listing ? (
            <InputNumber
              min={0}
              defaultValue={r.listing.lowStockThreshold}
              onChange={(v) => setDraft(r.variant.id, { lowStockThreshold: v ?? 0 })}
              style={{ width: 120 }}
            />
          ) : (
            "—"
          )
        }
      />
      <Table.Column<Row>
        title="Enabled"
        render={(_, r) =>
          r.listing ? (
            <Switch checked={r.listing.enabled} onChange={(v) => toggleEnabled(r.listing!, v)} />
          ) : (
            <Tag>No listing</Tag>
          )
        }
      />
      <Table.Column<Row>
        title="Actions"
        render={(_, r) =>
          r.listing ? (
            <Button size="small" loading={savingId === r.listing.id} onClick={() => saveListing(r.listing!)}>
              Save
            </Button>
          ) : (
            <Space>
              <Button size="small" type="primary" loading={savingId === r.variant.id} onClick={() => createListing(r.variant)}>
                Create listing
              </Button>
            </Space>
          )
        }
      />
    </Table>
  );
}
