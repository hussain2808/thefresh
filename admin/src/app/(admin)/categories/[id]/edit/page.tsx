"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { CategoryFormFields } from "@/components/category-form-fields";
import type { Category } from "@/types/catalog";

export default function EditCategoryPage() {
  const { formProps, saveButtonProps, id } = useForm<Category>({
    resource: "categories",
    action: "edit",
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <CategoryFormFields excludeId={String(id)} />
      </Form>
    </Edit>
  );
}
