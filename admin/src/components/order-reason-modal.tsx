"use client";

import { Modal, Form, Input } from "antd";

interface OrderReasonModalProps {
  open: boolean;
  title: string;
  okText?: string;
  confirmLoading?: boolean;
  onCancel: () => void;
  onSubmit: (reason?: string) => void;
}

// Shared by reject / cancel / delivery-failed — every action on the order
// lifecycle that takes an optional free-text reason.
export function OrderReasonModal({
  open,
  title,
  okText = "Confirm",
  confirmLoading,
  onCancel,
  onSubmit,
}: OrderReasonModalProps) {
  const [form] = Form.useForm<{ reason?: string }>();

  return (
    <Modal
      title={title}
      open={open}
      onCancel={onCancel}
      onOk={() => form.submit()}
      okText={okText}
      confirmLoading={confirmLoading}
      destroyOnHidden
    >
      <Form form={form} layout="vertical" onFinish={(values) => onSubmit(values.reason || undefined)}>
        <Form.Item label="Reason (optional)" name="reason">
          <Input.TextArea rows={3} placeholder="e.g. Out of stock" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
