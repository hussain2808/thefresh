"use client";

import { Form, Input, Select, Switch, Button, Space } from "antd";
import { PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";

const TYPES = ["TEXT", "NUMBER", "BOOLEAN", "SELECT", "MULTI_SELECT"];

export function AttributeFormFields() {
  return (
    <>
      <Form.Item label="Code" name="code" rules={[{ required: true }]} tooltip="Stable identifier, e.g. 'origin'.">
        <Input placeholder="e.g. origin" />
      </Form.Item>
      <Form.Item label="Label" name="label" rules={[{ required: true }]}>
        <Input placeholder="e.g. Country of Origin" />
      </Form.Item>
      <Form.Item label="Type" name="type" rules={[{ required: true }]}>
        <Select options={TYPES.map((value) => ({ label: value, value }))} />
      </Form.Item>
      <Form.Item label="Unit" name="unit" tooltip="Optional, e.g. '%', 'days', '°C'.">
        <Input placeholder="e.g. %" />
      </Form.Item>
      <Form.Item noStyle shouldUpdate={(prev, cur) => prev.type !== cur.type}>
        {({ getFieldValue }) => {
          const type = getFieldValue("type");
          if (type !== "SELECT" && type !== "MULTI_SELECT") return null;
          return (
            <Form.Item label="Options" required tooltip="Choices the value must be one of.">
              <Form.List name="options">
                {(fields, { add, remove }) => (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {fields.map((field) => (
                      <Space key={field.key} align="baseline">
                        <Form.Item {...field} rules={[{ required: true, message: "Required" }]} noStyle>
                          <Input placeholder="Option value" style={{ width: 280 }} />
                        </Form.Item>
                        <MinusCircleOutlined onClick={() => remove(field.name)} />
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add()} icon={<PlusOutlined />}>
                      Add option
                    </Button>
                  </Space>
                )}
              </Form.List>
            </Form.Item>
          );
        }}
      </Form.Item>
      <Form.Item
        label="Filterable"
        name="filterable"
        valuePropName="checked"
        initialValue={false}
        tooltip="Show this attribute as a customer-facing filter."
      >
        <Switch />
      </Form.Item>
    </>
  );
}
