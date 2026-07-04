"use client";

import { useState } from "react";
import { List, useTable } from "@refinedev/antd";
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  InputNumber,
  Select,
  Input,
  Drawer,
  App,
  Typography,
} from "antd";
import { apiFetch } from "@/lib/api-client";
import type { StockMovement, StoreListing } from "@/types/catalog";

export default function InventoryPage() {
  const { message } = App.useApp();
  const { tableProps, tableQuery } = useTable<StoreListing>({
    resource: "inventory",
    pagination: { mode: "off" },
  });

  const [adjustTarget, setAdjustTarget] = useState<StoreListing | null>(null);
  const [historyTarget, setHistoryTarget] = useState<StoreListing | null>(null);
  const [history, setHistory] = useState<StockMovement[]>([]);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  async function openHistory(listing: StoreListing) {
    setHistoryTarget(listing);
    const data = await apiFetch<StockMovement[]>(`/admin/listings/${listing.id}/stock-movements`);
    setHistory(data);
  }

  async function handleAdjust(values: { type: "RECEIVE" | "ADJUST"; qtyDelta: number; reason: string }) {
    if (!adjustTarget) return;
    setSubmitting(true);
    try {
      const qtyDelta = values.type === "ADJUST" && values.qtyDelta > 0 ? -values.qtyDelta : values.qtyDelta;
      await apiFetch(`/admin/listings/${adjustTarget.id}/stock-movements`, {
        method: "POST",
        body: JSON.stringify({ type: values.type, qtyDelta, reason: values.reason }),
      });
      message.success("Stock updated");
      setAdjustTarget(null);
      form.resetFields();
      tableQuery.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <List title="Inventory">
      <Table {...tableProps} rowKey="id" size="middle" sticky>
        <Table.Column<StoreListing> title="Product" render={(_, r) => r.variant?.family.name} />
        <Table.Column<StoreListing> title="Variant" render={(_, r) => `${r.variant?.name} (${r.variant?.sku})`} />
        <Table.Column<StoreListing>
          title="On hand"
          render={(_, r) => `${r.onHandQty}${r.variant?.sellingType === "WEIGHT" ? "g" : ""}`}
        />
        <Table.Column<StoreListing> title="Reserved" dataIndex="reservedQty" />
        <Table.Column<StoreListing>
          title="Available"
          render={(_, r) => {
            const available = r.onHandQty - r.reservedQty;
            const low = available <= r.lowStockThreshold;
            return <span style={{ color: low ? "#cf1322" : undefined }}>{available}</span>;
          }}
        />
        <Table.Column<StoreListing>
          title="Status"
          render={(_, r) =>
            r.onHandQty - r.reservedQty <= r.lowStockThreshold ? (
              <Tag color="red">Low stock</Tag>
            ) : (
              <Tag color="green">OK</Tag>
            )
          }
        />
        <Table.Column<StoreListing>
          title="Actions"
          render={(_, record) => (
            <Space>
              <Button size="small" onClick={() => setAdjustTarget(record)}>
                Adjust
              </Button>
              <Button size="small" onClick={() => openHistory(record)}>
                History
              </Button>
            </Space>
          )}
        />
      </Table>

      <Modal
        title={`Adjust stock — ${adjustTarget?.variant?.family.name ?? ""}`}
        open={!!adjustTarget}
        onCancel={() => setAdjustTarget(null)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleAdjust}>
          <Form.Item label="Type" name="type" initialValue="RECEIVE" rules={[{ required: true }]}>
            <Select
              options={[
                { label: "Receive (add stock)", value: "RECEIVE" },
                { label: "Adjust (remove — damage, count fix)", value: "ADJUST" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label={adjustTarget?.variant?.sellingType === "WEIGHT" ? "Quantity (grams)" : "Quantity"}
            name="qtyDelta"
            rules={[{ required: true }]}
            tooltip="Enter a positive amount — direction is set by the type above."
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item label="Reason" name="reason" rules={[{ required: true }]}>
            <Input.TextArea rows={2} placeholder="e.g. Damaged in transit" />
          </Form.Item>
        </Form>
      </Modal>

      <Drawer
        title={`Stock history — ${historyTarget?.variant?.family.name ?? ""}`}
        open={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        width={480}
      >
        {history.length === 0 ? (
          <Typography.Text type="secondary">No movements yet.</Typography.Text>
        ) : (
          history.map((m) => (
            <div key={m.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid #f0f0f0" }}>
              <Space>
                <Tag color={m.qtyDelta >= 0 ? "green" : "red"}>{m.type}</Tag>
                <strong>
                  {m.qtyDelta >= 0 ? "+" : ""}
                  {m.qtyDelta}
                </strong>
              </Space>
              <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
                {new Date(m.createdAt).toLocaleString()} {m.reason ? `— ${m.reason}` : ""}
              </div>
            </div>
          ))
        )}
      </Drawer>
    </List>
  );
}
