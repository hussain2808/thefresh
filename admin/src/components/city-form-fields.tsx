"use client";

import { Form, Input, Select, Switch } from "antd";
import { useSelect } from "@refinedev/core";
import type { Country } from "@/types/delivery";

export function CityFormFields() {
  const { options: countryOptions } = useSelect<Country>({
    resource: "countries",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Dubai" />
      </Form.Item>
      <Form.Item label="Country" name="countryId" rules={[{ required: true }]}>
        <Select options={countryOptions} showSearch optionFilterProp="label" />
      </Form.Item>
      <Form.Item label="Active" name="active" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}
