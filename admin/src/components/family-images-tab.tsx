"use client";

import { Button, Image, Space, App, Input, Form, Card } from "antd";
import { StarFilled, StarOutlined, DeleteOutlined } from "@ant-design/icons";
import { apiFetch } from "@/lib/api-client";
import type { ProductFamily } from "@/types/catalog";

export function FamilyImagesTab({ family, onSaved }: { family: ProductFamily; onSaved: () => void }) {
  const { message } = App.useApp();
  const [form] = Form.useForm();

  async function handleAdd(values: { url: string }) {
    try {
      await apiFetch(`/admin/catalog/families/${family.id}/images`, {
        method: "POST",
        body: JSON.stringify({ url: values.url, isPrimary: family.images.length === 0 }),
      });
      form.resetFields();
      onSaved();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to add image");
    }
  }

  async function setPrimary(imageId: string) {
    await apiFetch(`/admin/catalog/images/${imageId}/primary`, { method: "PATCH" });
    onSaved();
  }

  async function remove(imageId: string) {
    await apiFetch(`/admin/catalog/images/${imageId}`, { method: "DELETE" });
    onSaved();
  }

  return (
    <div>
      <Form form={form} layout="inline" onFinish={handleAdd} style={{ marginBottom: 16 }}>
        <Form.Item name="url" rules={[{ required: true, message: "Enter an image URL" }]}>
          <Input placeholder="https://…" style={{ width: 360 }} />
        </Form.Item>
        <Form.Item>
          <Button htmlType="submit">Add image</Button>
        </Form.Item>
      </Form>

      <Space wrap size={16}>
        {family.images.map((img) => (
          <Card
            key={img.id}
            size="small"
            style={{ width: 180 }}
            cover={<Image src={img.url} height={140} style={{ objectFit: "cover" }} />}
            actions={[
              img.isPrimary ? (
                <StarFilled key="primary" style={{ color: "#f59e0b" }} />
              ) : (
                <StarOutlined key="primary" onClick={() => setPrimary(img.id)} />
              ),
              <DeleteOutlined key="delete" onClick={() => remove(img.id)} />,
            ]}
          />
        ))}
        {family.images.length === 0 && <span style={{ color: "#9CA3AF" }}>No images yet.</span>}
      </Space>
    </div>
  );
}
