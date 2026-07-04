"use client";

import { Form, Input, Select, App, Button, Alert } from "antd";
import { useSelect } from "@refinedev/core";
import { apiFetch } from "@/lib/api-client";
import type { Brand, Category, ProductFamily } from "@/types/catalog";

export function FamilyBasicInfoTab({ family, onSaved }: { family: ProductFamily; onSaved: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const { options: categoryOptions } = useSelect<Category>({ resource: "categories", optionLabel: "name", optionValue: "id" });
  const { options: brandOptions } = useSelect<Brand>({ resource: "brands", optionLabel: "name", optionValue: "id" });

  async function handleFinish(values: Record<string, unknown>) {
    try {
      await apiFetch(`/admin/catalog/families/${family.id}`, {
        method: "PATCH",
        body: JSON.stringify(values),
      });
      message.success("Saved");
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to save");
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      style={{ maxWidth: 480 }}
      initialValues={{
        name: family.name,
        slug: family.slug,
        description: family.description,
        specification: family.specification,
        disclaimer: family.disclaimer,
        categoryId: family.categoryId,
        brandId: family.brandId,
        status: family.status,
      }}
      onFinish={handleFinish}
    >
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
        <Input />
      </Form.Item>
      <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}>
        <Select options={categoryOptions} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="Brand" name="brandId">
        <Select options={brandOptions} allowClear showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="Description" name="description">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item label="Specification" name="specification" tooltip="General product info shown as regular text.">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item
        label="Disclaimer"
        name="disclaimer"
        tooltip="Rendered prominently on the storefront (e.g. weight-billing notice)."
      >
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.disclaimer !== cur.disclaimer}>
        {({ getFieldValue }) => {
          const disclaimer = getFieldValue("disclaimer");
          if (!disclaimer) return null;
          return <Alert type="warning" showIcon message={disclaimer} style={{ marginBottom: 24 }} />;
        }}
      </Form.Item>
      <Form.Item
        label="Status"
        name="status"
        tooltip="Publishing requires ≥1 active variant, required attributes, and a priced listing."
      >
        <Select options={["DRAFT", "ACTIVE", "ARCHIVED"].map((v) => ({ label: v, value: v }))} />
      </Form.Item>
      <Button type="primary" htmlType="submit">
        Save
      </Button>
    </Form>
  );
}
