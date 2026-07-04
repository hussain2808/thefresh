"use client";

import { Form, Input, InputNumber, Switch, Select, Row, Col, Typography, Divider } from "antd";
import { useSelect } from "@refinedev/core";
import type { Zone } from "@/types/delivery";

export function DeliveryMethodFormFields() {
  const { options: zoneOptions } = useSelect<Zone>({ resource: "zones", optionLabel: "name", optionValue: "id" });

  return (
    <>
      <Form.Item label="Name" name="name" rules={[{ required: true }]}>
        <Input placeholder="e.g. Express Delivery" />
      </Form.Item>
      <Form.Item label="Code" name="code" rules={[{ required: true }]} tooltip="Stable identifier, e.g. 'EXPRESS'.">
        <Input placeholder="e.g. EXPRESS" />
      </Form.Item>
      <Form.Item label="Description" name="description">
        <Input.TextArea rows={2} />
      </Form.Item>

      <Divider />
      <Typography.Title level={5} style={{ marginTop: 0 }}>
        Pricing &amp; ETA
      </Typography.Title>
      <Row gutter={24}>
        <Col span={12}>
          <Form.Item label="Fee (AED)" name="feeAed" rules={[{ required: true }]}>
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Minimum order (AED)" name="minimumOrderAmountAed" initialValue={0}>
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Free delivery above (AED)" name="freeDeliveryAboveAed" tooltip="Optional.">
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Estimated delivery (minutes)"
            name="estimatedDeliveryMinutes"
            tooltip="Leave empty for slot-based methods — customers pick a slot instead of seeing an ETA."
          >
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Col>
      </Row>

      <Divider />
      <Form.Item
        label="Restrict to zones"
        name="zoneIds"
        tooltip="Leave empty to make this method available everywhere. Select specific zones to restrict it."
      >
        <Select mode="multiple" options={zoneOptions} allowClear placeholder="Available everywhere" />
      </Form.Item>

      <Form.Item label="Active" name="active" valuePropName="checked" initialValue={true}>
        <Switch />
      </Form.Item>
    </>
  );
}
