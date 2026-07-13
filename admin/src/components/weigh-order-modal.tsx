"use client";

import { useState } from "react";
import { Modal, Row, Col, Typography, InputNumber, Space } from "antd";
import type { Order } from "@/types/orders";
import type { WeighLine } from "@/lib/order-actions";

interface WeighOrderModalProps {
  order: Order | null;
  open: boolean;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (items: WeighLine[]) => void;
}

function defaultWeights(order: Order | null): Record<string, number> {
  const defaults: Record<string, number> = {};
  for (const item of order?.items ?? []) {
    if (item.basePriceFils != null && item.weightGrams != null) {
      defaults[item.id] = item.weightGrams;
    }
  }
  return defaults;
}

// Shared between the orders list (inline "Record weights" quick action) and
// the order detail page, so both surfaces walk the exact same WEIGHT lines
// through the exact same submit shape.
export function WeighOrderModal({ order, open, confirmLoading, onCancel, onSubmit }: WeighOrderModalProps) {
  const [weights, setWeights] = useState<Record<string, number>>({});
  // Reset the draft weights the moment the modal opens (adjusting state
  // during render per React's guidance, rather than an effect — avoids a
  // cascading re-render just to sync from a prop transition).
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (open) setWeights(defaultWeights(order));
  }

  const weightLines = order?.items.filter((item) => item.basePriceFils != null) ?? [];

  return (
    <Modal
      title="Record actual weights"
      open={open}
      onCancel={onCancel}
      onOk={() =>
        onSubmit(
          Object.entries(weights).map(([orderItemId, actualWeightGrams]) => ({ orderItemId, actualWeightGrams })),
        )
      }
      confirmLoading={confirmLoading}
      okText="Recalculate order"
      destroyOnHidden
    >
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        {weightLines.map((item) => (
          <Row key={item.id} align="middle" gutter={12}>
            <Col span={12}>
              <Typography.Text>{item.productName ?? item.variantId}</Typography.Text>
              <br />
              <Typography.Text type="secondary">Requested: {item.weightGrams}g</Typography.Text>
            </Col>
            <Col span={12}>
              <InputNumber
                min={1}
                addonAfter="g"
                style={{ width: "100%" }}
                value={weights[item.id]}
                onChange={(value) => setWeights((prev) => ({ ...prev, [item.id]: value ?? 0 }))}
              />
            </Col>
          </Row>
        ))}
      </Space>
    </Modal>
  );
}
