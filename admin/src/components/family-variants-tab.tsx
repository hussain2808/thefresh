"use client";

import { useState } from "react";
import {
  Table,
  Tag,
  Space,
  Button,
  Modal,
  Form,
  Input,
  InputNumber,
  Select,
  App,
  Descriptions,
} from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { apiFetch } from "@/lib/api-client";
import { SELLING_TYPE_COLORS, STATUS_COLORS, type ProductFamily, type SellingType, type Variant } from "@/types/catalog";

const SELLING_TYPES: SellingType[] = ["WEIGHT", "UNIT", "VOLUME", "PACK", "BUNDLE"];

export function FamilyVariantsTab({ family, onSaved }: { family: ProductFamily; onSaved: () => void }) {
  const { message } = App.useApp();
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [sellingType, setSellingType] = useState<SellingType>("UNIT");
  const [submitting, setSubmitting] = useState(false);

  async function handleAdd(values: Record<string, unknown>) {
    setSubmitting(true);
    try {
      const { displayWeightGrams, wastePercent, weightOptions, ...variant } = values as {
        displayWeightGrams?: number;
        wastePercent?: number;
        weightOptions?: { weightGrams: number; modifierPercent?: number; label?: string }[];
        [key: string]: unknown;
      };
      const payload: Record<string, unknown> = { ...variant, sellingType };
      if (sellingType === "WEIGHT") {
        if (displayWeightGrams || wastePercent) {
          payload.weightRule = { displayWeightGrams, wastePercent };
        }
        payload.weightOptions = weightOptions ?? [];
      }
      await apiFetch(`/admin/catalog/families/${family.id}/variants`, {
        method: "POST",
        body: JSON.stringify(payload),
      });
      message.success("Variant added");
      setModalOpen(false);
      form.resetFields();
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to add variant");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(variantId: string) {
    try {
      await apiFetch(`/admin/catalog/variants/${variantId}`, { method: "DELETE" });
      message.success("Variant removed");
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to remove variant");
    }
  }

  return (
    <>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<PlusOutlined />} onClick={() => setModalOpen(true)}>
          Add variant
        </Button>
      </Space>

      <Table<Variant>
        dataSource={family.variants}
        rowKey="id"
        size="middle"
        pagination={false}
        expandable={{
          rowExpandable: (v) => v.sellingType === "WEIGHT",
          expandedRowRender: (v) => (
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="Display weight">
                {v.weightRule?.displayWeightGrams ? `${v.weightRule.displayWeightGrams}g` : "— (shows per-kg price)"}
              </Descriptions.Item>
              <Descriptions.Item label="Waste %">{v.weightRule?.wastePercent ?? "—"}</Descriptions.Item>
              <Descriptions.Item label="Presets" span={2}>
                {(v.weightOptions ?? [])
                  .map((o) => `${o.label ?? o.weightGrams + "g"} (${o.modifierPercent >= 0 ? "+" : ""}${o.modifierPercent}%)`)
                  .join(", ") || "None"}
              </Descriptions.Item>
            </Descriptions>
          ),
        }}
      >
        <Table.Column<Variant> title="SKU" dataIndex="sku" />
        <Table.Column<Variant> title="Name" dataIndex="name" />
        <Table.Column<Variant>
          title="Selling type"
          dataIndex="sellingType"
          render={(v: SellingType) => <Tag color={SELLING_TYPE_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column<Variant>
          title="Net content"
          render={(_, r) => (r.netContentValue ? `${r.netContentValue} ${r.netContentUnit ?? ""}` : "—")}
        />
        <Table.Column<Variant>
          title="Status"
          dataIndex="status"
          render={(v: Variant["status"]) => <Tag color={STATUS_COLORS[v]}>{v}</Tag>}
        />
        <Table.Column<Variant>
          title="Actions"
          render={(_, record) => (
            <Button danger size="small" onClick={() => handleRemove(record.id)}>
              Remove
            </Button>
          )}
        />
      </Table>

      <Modal
        title="Add variant"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        width={640}
      >
        <Form form={form} layout="vertical" onFinish={handleAdd}>
          <Form.Item label="SKU" name="sku" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Barcode" name="barcode">
            <Input />
          </Form.Item>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item label="Selling type" rules={[{ required: true }]}>
            <Select value={sellingType} onChange={setSellingType} options={SELLING_TYPES.map((v) => ({ label: v, value: v }))} />
          </Form.Item>
          {sellingType !== "WEIGHT" && (
            <Space>
              <Form.Item label="Net content value" name="netContentValue">
                <InputNumber />
              </Form.Item>
              <Form.Item label="Net content unit" name="netContentUnit">
                <Input placeholder="ml" />
              </Form.Item>
            </Space>
          )}
          {sellingType === "WEIGHT" && (
            <>
              <Form.List name="weightOptions" initialValue={[{ weightGrams: 1000, label: "1kg", modifierPercent: 0 }]}>
                {(fields, { add, remove }) => (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {fields.map((field) => (
                      <Space key={field.key}>
                        <Form.Item {...field} name={[field.name, "label"]} rules={[{ required: true }]}>
                          <Input placeholder="Label" style={{ width: 120 }} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, "weightGrams"]} rules={[{ required: true }]}>
                          <InputNumber placeholder="Grams" addonAfter="g" style={{ width: 130 }} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, "modifierPercent"]} initialValue={0}>
                          <InputNumber addonAfter="%" style={{ width: 110 }} />
                        </Form.Item>
                        <Button danger size="small" onClick={() => remove(field.name)}>
                          Remove
                        </Button>
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add({ modifierPercent: 0 })}>
                      + Add preset
                    </Button>
                  </Space>
                )}
              </Form.List>
              <Form.Item
                label="Display weight (g)"
                name="displayWeightGrams"
                tooltip="Optional — psychological pricing. Must match one of the presets above (e.g. 500 to headline the 500g price instead of the per-kg price)."
              >
                <InputNumber addonAfter="g" style={{ width: 160 }} />
              </Form.Item>
              <Form.Item
                label="Waste %"
                name="wastePercent"
                tooltip="For products like fish sold on pre-cleaning weight — expected yield loss."
              >
                <InputNumber addonAfter="%" style={{ width: 160 }} />
              </Form.Item>
            </>
          )}
        </Form>
      </Modal>
    </>
  );
}
