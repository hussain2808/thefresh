"use client";

import { Form, Input, InputNumber, Switch, Select, DatePicker, Button, Space, Divider, Typography } from "antd";
import { PlusOutlined, DeleteOutlined } from "@ant-design/icons";
import { CONDITION_TYPE_OPTIONS, REWARD_TYPE_OPTIONS } from "@/types/promotions";

export function CouponFormFields() {
  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Welcome Discount" />
      </Form.Item>
      <Form.Item label="Description" name="description">
        <Input.TextArea rows={2} />
      </Form.Item>
      <Form.Item label="Code" name="code" rules={[{ required: true }]} tooltip="Customer-facing code, e.g. WELCOME20.">
        <Input placeholder="e.g. WELCOME20" style={{ textTransform: "uppercase" }} />
      </Form.Item>

      <Divider />
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Reward
      </Typography.Title>
      <Form.Item label="Reward type" name={["reward", "rewardType"]} rules={[{ required: true }]}>
        <Select options={REWARD_TYPE_OPTIONS} />
      </Form.Item>
      <Form.Item
        noStyle
        shouldUpdate={(prev, cur) => prev?.reward?.rewardType !== cur?.reward?.rewardType}
      >
        {({ getFieldValue }) => {
          const rewardType = getFieldValue(["reward", "rewardType"]);
          if (rewardType === "FREE_DELIVERY") return null;
          return (
            <>
              <Form.Item
                label={rewardType === "PERCENTAGE_DISCOUNT" ? "Percentage off" : "Discount (AED)"}
                name={["reward", "value"]}
                rules={[{ required: true }]}
                tooltip={rewardType === "PERCENTAGE_DISCOUNT" ? "Integer percent, e.g. 20 for 20% off." : "In AED."}
              >
                <InputNumber min={0} style={{ width: "100%" }} />
              </Form.Item>
              {rewardType === "PERCENTAGE_DISCOUNT" && (
                <Form.Item
                  label="Max discount (AED)"
                  name={["reward", "maxDiscountFils"]}
                  tooltip="Optional cap on the discount amount."
                >
                  <InputNumber min={0} style={{ width: "100%" }} />
                </Form.Item>
              )}
            </>
          );
        }}
      </Form.Item>

      <Divider />
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Conditions
      </Typography.Title>
      <Typography.Paragraph type="secondary" style={{ marginTop: -8 }}>
        All conditions must pass for the coupon to be eligible. Leave empty for no restrictions.
      </Typography.Paragraph>
      <Form.List name="conditions">
        {(fields, { add, remove }) => (
          <>
            {fields.map((field) => (
              <Space key={field.key} align="baseline" style={{ display: "flex", marginBottom: 8 }}>
                <Form.Item
                  {...field}
                  name={[field.name, "conditionType"]}
                  rules={[{ required: true, message: "Required" }]}
                  style={{ marginBottom: 0, width: 220 }}
                >
                  <Select options={CONDITION_TYPE_OPTIONS} placeholder="Condition type" />
                </Form.Item>
                <Form.Item
                  {...field}
                  name={[field.name, "value"]}
                  rules={[{ required: true, message: "Required" }]}
                  style={{ marginBottom: 0, width: 200 }}
                >
                  <Input placeholder="Value (e.g. 5000, zone id, true)" />
                </Form.Item>
                <Form.Item {...field} name={[field.name, "operator"]} initialValue="=" hidden>
                  <Input />
                </Form.Item>
                <DeleteOutlined onClick={() => remove(field.name)} style={{ color: "#ef4444" }} />
              </Space>
            ))}
            <Button type="dashed" onClick={() => add({ operator: "=" })} icon={<PlusOutlined />}>
              Add condition
            </Button>
          </>
        )}
      </Form.List>

      <Divider />
      <Form.Item label="Start date" name="startAt">
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="End date" name="endAt">
        <DatePicker showTime style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Priority" name="priority" initialValue={0} tooltip="Higher priority resolves first if multiple rules apply in the future.">
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Usage limit" name="usageLimit" tooltip="Total redemptions allowed across all customers. Leave empty for unlimited.">
        <InputNumber min={1} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Per-customer limit" name="perUserLimit" tooltip="Leave empty for unlimited.">
        <InputNumber min={1} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Active" name="isActive" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}
