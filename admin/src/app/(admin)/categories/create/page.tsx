"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { CategoryFormFields } from "@/components/category-form-fields";
import type { Category } from "@/types/catalog";

export default function CreateCategoryPage() {
  const { formProps, saveButtonProps } = useForm<Category>({
    resource: "categories",
    action: "create",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <CategoryFormFields />
      </Form>
    </Create>
  );
}
