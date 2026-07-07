"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import type { HttpError } from "@refinedev/core";
import { CouponFormFields } from "@/components/coupon-form-fields";
import { toCouponPayload, type CouponFormValues } from "@/lib/coupon-form-transform";
import type { Coupon } from "@/types/promotions";

export default function CreateCouponPage() {
  const { formProps, saveButtonProps } = useForm<Coupon, HttpError, CouponFormValues>({
    resource: "coupons",
    action: "create",
  });

  const onFinish = (values: CouponFormValues) => {
    return formProps.onFinish?.(toCouponPayload(values) as unknown as CouponFormValues);
  };

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} onFinish={onFinish} layout="vertical" style={{ maxWidth: 560 }}>
        <CouponFormFields />
      </Form>
    </Create>
  );
}
