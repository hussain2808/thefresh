"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form, Divider, Card, Typography, Empty, Tag, Space } from "antd";
import { ZoneFormFields } from "@/components/zone-form-fields";
import { formatAed } from "@/lib/money";
import type { Zone } from "@/types/delivery";

function AvailableMethodsCard({ zone }: { zone: Zone }) {
  const methods = zone.methodZones?.map((mz) => mz.deliveryMethod).filter(Boolean) ?? [];

  return (
    <Card title="Delivery methods restricted to this zone" style={{ marginTop: 24 }}>
      <Typography.Paragraph type="secondary">
        Methods with no zone restriction are available everywhere and won&apos;t appear here. Manage restrictions from
        the delivery method&apos;s edit page.
      </Typography.Paragraph>
      {methods.length === 0 ? (
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No zone-restricted methods" />
      ) : (
        <Space direction="vertical">
          {methods.map((m) => (
            <Space key={m!.id}>
              <Tag color="blue">{m!.name}</Tag>
              <Typography.Text type="secondary">{formatAed(m!.feeFils)}</Typography.Text>
            </Space>
          ))}
        </Space>
      )}
    </Card>
  );
}

export default function EditZonePage() {
  const { formProps, saveButtonProps, query } = useForm<Zone>({ resource: "zones", action: "edit" });
  const record = query?.data?.data;

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <ZoneFormFields />
      </Form>
      <Divider />
      {record && <AvailableMethodsCard zone={record} />}
    </Edit>
  );
}
