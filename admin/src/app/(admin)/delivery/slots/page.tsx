"use client";

import { useState } from "react";
import { List, useTable } from "@refinedev/antd";
import { Table, Select, Space, Button, Modal, Form, Input, InputNumber, App, Tag, Typography } from "antd";
import { PlusOutlined } from "@ant-design/icons";
import { useSelect } from "@refinedev/core";
import { apiFetch } from "@/lib/api-client";
import { formatMinutes, type DeliverySlot, type DeliveryMethod, type Zone } from "@/types/delivery";

export default function DeliverySlotsPage() {
  const { message } = App.useApp();
  const [methodId, setMethodId] = useState<string | undefined>();
  const [zoneId, setZoneId] = useState<string | undefined>();
  const { tableProps, tableQuery } = useTable<DeliverySlot>({
    resource: "delivery-slots",
    filters: {
      permanent: methodId ? [{ field: "deliveryMethodId", operator: "eq", value: methodId }] : [],
    },
    pagination: { mode: "off" },
    queryOptions: { enabled: !!methodId },
  });
  const [modalOpen, setModalOpen] = useState(false);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const { options: methodOptions } = useSelect<DeliveryMethod>({
    resource: "delivery-methods",
    optionLabel: "name",
    optionValue: "id",
  });
  const { options: zoneOptions } = useSelect<Zone>({ resource: "zones", optionLabel: "name", optionValue: "id" });

  function timeToMinutes(value: string): number {
    const [h, m] = value.split(":").map(Number);
    return h * 60 + m;
  }

  async function handleCreate(values: { name?: string; startTime: string; endTime: string; capacity: number; zoneId?: string }) {
    setSubmitting(true);
    try {
      await apiFetch("/admin/delivery/slots", {
        method: "POST",
        body: JSON.stringify({
          deliveryMethodId: methodId,
          zoneId: values.zoneId,
          name: values.name,
          startMinute: timeToMinutes(values.startTime),
          endMinute: timeToMinutes(values.endTime),
          capacity: values.capacity,
        }),
      });
      message.success("Slot added");
      setModalOpen(false);
      form.resetFields();
      tableQuery.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to add slot");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await apiFetch(`/admin/delivery/slots/${id}`, { method: "DELETE" });
      tableQuery.refetch();
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to remove slot");
    }
  }

  return (
    <List
      title="Slot Management"
      headerButtons={
        <Button icon={<PlusOutlined />} type="primary" disabled={!methodId} onClick={() => setModalOpen(true)}>
          New slot
        </Button>
      }
    >
      <Space style={{ marginBottom: 16 }}>
        <Typography.Text>Delivery method:</Typography.Text>
        <Select
          options={methodOptions}
          value={methodId}
          onChange={(v) => {
            setMethodId(v);
            setZoneId(undefined);
          }}
          allowClear
          showSearch
          optionFilterProp="label"
          style={{ width: 240 }}
          placeholder="Select a delivery method"
        />
        {methodId && (
          <>
            <Typography.Text>Zone override:</Typography.Text>
            <Select
              options={zoneOptions}
              value={zoneId}
              onChange={setZoneId}
              allowClear
              showSearch
              optionFilterProp="label"
              style={{ width: 200 }}
              placeholder="All zones"
            />
          </>
        )}
      </Space>

      {methodId ? (
        <Table
          {...tableProps}
          dataSource={(tableProps.dataSource ?? []).filter((s) => (zoneId ? s.zoneId === zoneId : true))}
          rowKey="id"
          size="middle"
        >
          <Table.Column<DeliverySlot>
            title="Time"
            render={(_, r) => r.name ?? `${formatMinutes(r.startMinute)} - ${formatMinutes(r.endMinute)}`}
          />
          <Table.Column<DeliverySlot>
            title="Zone"
            render={(_, r) => (r.zone ? <Tag color="blue">{r.zone.name}</Tag> : <Tag color="green">Generic (all zones)</Tag>)}
          />
          <Table.Column<DeliverySlot> title="Capacity" dataIndex="capacity" />
          <Table.Column<DeliverySlot> title="Booked" dataIndex="bookedCount" />
          <Table.Column<DeliverySlot>
            title="Remaining"
            render={(_, r) => {
              const remaining = r.capacity - r.bookedCount;
              return <Tag color={remaining > 0 ? "green" : "red"}>{remaining}</Tag>;
            }}
          />
          <Table.Column<DeliverySlot>
            title="Active"
            dataIndex="active"
            render={(v: boolean) => (v ? <Tag color="green">Yes</Tag> : <Tag>No</Tag>)}
          />
          <Table.Column<DeliverySlot>
            title="Actions"
            render={(_, r) => (
              <Button danger size="small" onClick={() => handleRemove(r.id)}>
                Remove
              </Button>
            )}
          />
        </Table>
      ) : (
        <Typography.Text type="secondary">Select a delivery method above to view and manage its slots.</Typography.Text>
      )}

      <Modal
        title="New delivery slot"
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={submitting}
      >
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item label="Label" name="name" tooltip="Optional — defaults to start–end time.">
            <Input placeholder="e.g. Morning slot" />
          </Form.Item>
          <Form.Item
            label="Zone override"
            name="zoneId"
            tooltip="Leave empty to create a generic slot available for every zone."
          >
            <Select options={zoneOptions} allowClear showSearch optionFilterProp="label" placeholder="All zones" />
          </Form.Item>
          <Form.Item label="Start time" name="startTime" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item label="End time" name="endTime" rules={[{ required: true }]}>
            <Input type="time" />
          </Form.Item>
          <Form.Item label="Capacity" name="capacity" rules={[{ required: true }]}>
            <InputNumber min={1} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </Modal>
    </List>
  );
}
