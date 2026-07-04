"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import type { HttpError } from "@refinedev/core";
import { DeliveryMethodFormFields } from "@/components/delivery-method-form-fields";
import { apiFetch } from "@/lib/api-client";
import { toFils } from "@/lib/money";
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

export default function CreateDeliveryMethodPage() {
  const { formProps, saveButtonProps } = useForm<DeliveryMethod, HttpError, FormValues>({
    resource: "delivery-methods",
    action: "create",
  });

  const onFinish = async (values: FormValues) => {
    const { zoneIds, feeAed, minimumOrderAmountAed, freeDeliveryAboveAed, ...rest } = values;
    const created = (await formProps.onFinish?.({
      ...rest,
      feeFils: toFils(feeAed),
      minimumOrderAmountFils: minimumOrderAmountAed ? toFils(minimumOrderAmountAed) : 0,
      freeDeliveryAboveFils: freeDeliveryAboveAed ? toFils(freeDeliveryAboveAed) : undefined,
    } as unknown as FormValues)) as { data?: DeliveryMethod } | undefined;
    if (created?.data?.id && zoneIds && zoneIds.length > 0) {
      await apiFetch(`/admin/delivery/methods/${created.data.id}/zones`, {
        method: "PUT",
        body: JSON.stringify({ zoneIds }),
      });
    }
  };

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} onFinish={onFinish} layout="vertical" style={{ maxWidth: 480 }}>
        <DeliveryMethodFormFields />
      </Form>
    </Create>
  );
}
