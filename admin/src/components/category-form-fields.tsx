"use client";

import { Form, Input, InputNumber, Select } from "antd";
import { useSelect } from "@refinedev/core";
import type { Category } from "@/types/catalog";

export function CategoryFormFields({ excludeId }: { excludeId?: string }) {
  const { options: parentOptions } = useSelect<Category>({
    resource: "categories",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Fruits" />
      </Form.Item>
      <Form.Item
        label="Slug"
        name="slug"
        rules={[{ required: true }]}
        tooltip="URL-friendly identifier, e.g. 'fruits'. Must be unique."
      >
        <Input placeholder="e.g. fruits" />
      </Form.Item>
      <Form.Item
        label="Parent category"
        name="parentId"
        tooltip="Leave empty for a top-level category."
      >
        <Select
          options={parentOptions.filter((o) => o.value !== excludeId)}
          allowClear
          placeholder="None (top level)"
        />
      </Form.Item>
      <Form.Item label="Image URL" name="imageUrl">
        <Input placeholder="https://…" />
      </Form.Item>
      <Form.Item label="Sort order" name="sortOrder" initialValue={0}>
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>
    </>
  );
}
