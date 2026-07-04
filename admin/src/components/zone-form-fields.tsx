"use client";

import { Form, Input, Select, Switch } from "antd";
import { useSelect } from "@refinedev/core";
import type { City } from "@/types/delivery";

export function ZoneFormFields() {
  const { options: cityOptions } = useSelect<City>({
    resource: "cities",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. New Dubai" />
      </Form.Item>
      <Form.Item label="City" name="cityId" rules={[{ required: true }]}>
        <Select options={cityOptions} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="Active" name="active" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}
