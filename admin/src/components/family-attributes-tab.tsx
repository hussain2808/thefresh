"use client";

import { useEffect, useState } from "react";
import { Form, Input, InputNumber, Select, Switch, Button, App, Spin } from "antd";
import { apiFetch } from "@/lib/api-client";
import type { CategoryAttribute, ProductFamily } from "@/types/catalog";

export function FamilyAttributesTab({ family, onSaved }: { family: ProductFamily; onSaved: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [definitions, setDefinitions] = useState<CategoryAttribute[] | null>(null);

  useEffect(() => {
    apiFetch<CategoryAttribute[]>(`/admin/catalog/categories/${family.categoryId}/effective-attributes`).then(
      setDefinitions,
    );
  }, [family.categoryId]);

  useEffect(() => {
    if (!definitions) return;
    const initial: Record<string, unknown> = {};
    for (const def of definitions) {
      const existing = family.attributes.find((a) => a.attributeId === def.attributeId);
      if (existing) initial[def.attributeId] = existing.value;
    }
    form.setFieldsValue(initial);
  }, [definitions, family.attributes, form]);

  async function handleFinish(values: Record<string, unknown>) {
    try {
      const payload = Object.entries(values)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([attributeId, value]) => ({ attributeId, value }));
      await apiFetch(`/admin/catalog/families/${family.id}/attributes`, {
        method: "PUT",
        body: JSON.stringify({ values: payload }),
      });
      message.success("Attributes saved");
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to save attributes");
    }
  }

  if (!definitions) return <Spin />;
  if (definitions.length === 0) {
    return <span style={{ color: "#9CA3AF" }}>This category has no attributes configured.</span>;
  }

  return (
    <Form form={form} layout="vertical" style={{ maxWidth: 480 }} onFinish={handleFinish}>
      {definitions.map((def) => {
        const attr = def.attribute;
        const label = `${attr.label}${def.required ? " *" : ""}${attr.unit ? ` (${attr.unit})` : ""}`;
        return (
          <Form.Item
            key={attr.id}
            label={label}
            name={attr.id}
            valuePropName={attr.type === "BOOLEAN" ? "checked" : "value"}
            rules={def.required ? [{ required: true, message: `${attr.label} is required` }] : []}
          >
            {attr.type === "BOOLEAN" ? (
              <Switch />
            ) : attr.type === "NUMBER" ? (
              <InputNumber style={{ width: "100%" }} />
            ) : attr.type === "SELECT" ? (
              <Select options={(attr.options ?? []).map((o) => ({ label: o, value: o }))} allowClear />
            ) : attr.type === "MULTI_SELECT" ? (
              <Select mode="multiple" options={(attr.options ?? []).map((o) => ({ label: o, value: o }))} />
            ) : (
              <Input />
            )}
          </Form.Item>
        );
      })}
      <Button type="primary" htmlType="submit">
        Save attributes
      </Button>
    </Form>
  );
}
