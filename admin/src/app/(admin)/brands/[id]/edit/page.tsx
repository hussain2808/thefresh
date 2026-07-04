"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { BrandFormFields } from "@/components/brand-form-fields";
import type { Brand } from "@/types/catalog";

export default function EditBrandPage() {
  const { formProps, saveButtonProps } = useForm<Brand>({ resource: "brands", action: "edit" });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <BrandFormFields />
      </Form>
    </Edit>
  );
}
