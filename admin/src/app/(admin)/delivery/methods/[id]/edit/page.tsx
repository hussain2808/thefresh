"use client";

import { useEffect } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import type { HttpError } from "@refinedev/core";
import { DeliveryMethodFormFields } from "@/components/delivery-method-form-fields";
import { apiFetch } from "@/lib/api-client";
import { toAed, toFils } from "@/lib/money";
import type { DeliveryMethod } from "@/types/delivery";

interface FormValues {
  name: string;
  code: string;
  description?: string;
  feeAed: number;
  minimumOrderAmountAed?: number;
  freeDeliveryAboveAed?: number;
  estimatedDeliveryMinutes?: number;
  zoneIds?: string[];
  active: boolean;
}

export default function EditDeliveryMethodPage() {
  const { formProps, saveButtonProps, form, query } = useForm<DeliveryMethod, HttpError, FormValues>({
    resource: "delivery-methods",
    action: "edit",
  });

  const record = query?.data?.data;

  useEffect(() => {
    if (!record) return;
    form.setFieldsValue({
      feeAed: toAed(record.feeFils),
      minimumOrderAmountAed: toAed(record.minimumOrderAmountFils),
      freeDeliveryAboveAed: record.freeDeliveryAboveFils ? toAed(record.freeDeliveryAboveFils) : undefined,
      zoneIds: record.zones?.map((z: { zoneId: string }) => z.zoneId) ?? [],
    });
  }, [record, form]);

  const onFinish = async (values: FormValues) => {
    const { zoneIds, feeAed, minimumOrderAmountAed, freeDeliveryAboveAed, ...rest } = values;
    await formProps.onFinish?.({
      ...rest,
      feeFils: toFils(feeAed),
      minimumOrderAmountFils: minimumOrderAmountAed ? toFils(minimumOrderAmountAed) : 0,
      freeDeliveryAboveFils: freeDeliveryAboveAed ? toFils(freeDeliveryAboveAed) : undefined,
    } as unknown as FormValues);
    if (record?.id) {
      await apiFetch(`/admin/delivery/methods/${record.id}/zones`, {
        method: "PUT",
        body: JSON.stringify({ zoneIds: zoneIds ?? [] }),
      });
    }
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} onFinish={onFinish} layout="vertical" style={{ maxWidth: 480 }}>
        <DeliveryMethodFormFields />
      </Form>
    </Edit>
  );
}
