"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { BrandFormFields } from "@/components/brand-form-fields";
import type { Brand } from "@/types/catalog";

export default function CreateBrandPage() {
  const { formProps, saveButtonProps } = useForm<Brand>({ resource: "brands", action: "create" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <BrandFormFields />
      </Form>
    </Create>
  );
}
