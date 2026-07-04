"use client";

import { Form, Input, Select, Switch } from "antd";
import { useSelect } from "@refinedev/core";
import type { Zone } from "@/types/delivery";

export function AreaFormFields() {
  const { options: zoneOptions } = useSelect<Zone>({
    resource: "zones",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Marina" />
      </Form.Item>
      <Form.Item label="Zone" name="zoneId" rules={[{ required: true }]}>
        <Select options={zoneOptions} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="Active" name="active" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}
