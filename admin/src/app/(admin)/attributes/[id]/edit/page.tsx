"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { AttributeFormFields } from "@/components/attribute-form-fields";
import type { AttributeDefinition } from "@/types/catalog";

export default function EditAttributePage() {
  const { formProps, saveButtonProps } = useForm<AttributeDefinition>({
    resource: "attributes",
    action: "edit",
  });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <AttributeFormFields />
      </Form>
    </Edit>
  );
}
