"use client";

import { Form, Input } from "antd";

export function BrandFormFields() {
  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Almarai" />
      </Form.Item>
      <Form.Item label="Slug" name="slug" rules={[{ required: true }]}>
        <Input placeholder="e.g. almarai" />
      </Form.Item>
      <Form.Item label="Logo URL" name="logoUrl">
        <Input placeholder="https://…" />
      </Form.Item>
    </>
  );
}
