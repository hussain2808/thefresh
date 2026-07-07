"use client";

import { useEffect } from "react";
import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import type { HttpError } from "@refinedev/core";
import dayjs from "dayjs";
import { CouponFormFields } from "@/components/coupon-form-fields";
import { toAed } from "@/lib/money";
import { toCouponPayload, type CouponFormValues } from "@/lib/coupon-form-transform";
import type { Coupon, PromotionConditionType } from "@/types/promotions";

function displayConditionValue(conditionType: PromotionConditionType, value: unknown): string {
  if (conditionType === "MIN_ORDER_VALUE") return String(toAed(Number(value)));
  if (conditionType === "FIRST_ORDER") return String(value);
  return String(value);
}

export default function EditCouponPage() {
  const { formProps, saveButtonProps, form, query } = useForm<Coupon, HttpError, CouponFormValues>({
    resource: "coupons",
    action: "edit",
  });
  const record = query?.data?.data;

  useEffect(() => {
    if (!record) return;
    const reward = record.promotion.rewards[0];
    form.setFieldsValue({
      name: record.promotion.name,
      description: record.promotion.description ?? undefined,
      code: record.code,
      reward: reward
        ? {
            rewardType: reward.rewardType,
            value: reward.rewardType === "PERCENTAGE_DISCOUNT" ? reward.value : toAed(reward.value),
            maxDiscountFils: reward.maxDiscountFils != null ? toAed(reward.maxDiscountFils) : undefined,
          }
        : undefined,
      conditions: record.promotion.conditions.map((c) => ({
        conditionType: c.conditionType,
        value: displayConditionValue(c.conditionType, c.value),
      })),
      startAt: record.promotion.startAt ? dayjs(record.promotion.startAt) : undefined,
      endAt: record.promotion.endAt ? dayjs(record.promotion.endAt) : undefined,
      priority: record.promotion.priority,
      usageLimit: record.usageLimit ?? undefined,
      perUserLimit: record.perUserLimit ?? undefined,
      isActive: record.promotion.isActive,
    });
  }, [record, form]);

  const onFinish = (values: CouponFormValues) => {
    return formProps.onFinish?.(toCouponPayload(values) as unknown as CouponFormValues);
  };

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} onFinish={onFinish} layout="vertical" style={{ maxWidth: 560 }}>
        <CouponFormFields />
      </Form>
    </Edit>
  );
}
