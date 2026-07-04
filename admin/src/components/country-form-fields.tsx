"use client";

import { Form, Input, Switch } from "antd";

export function CountryFormFields() {
  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. United Arab Emirates" />
      </Form.Item>
      <Form.Item label="Code" name="code" rules={[{ required: true }]} tooltip="ISO alpha-2, e.g. 'AE'.">
        <Input placeholder="e.g. AE" />
      </Form.Item>
      <Form.Item label="Active" name="active" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}
