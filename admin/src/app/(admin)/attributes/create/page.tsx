"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { AttributeFormFields } from "@/components/attribute-form-fields";
import type { AttributeDefinition } from "@/types/catalog";

export default function CreateAttributePage() {
  const { formProps, saveButtonProps } = useForm<AttributeDefinition>({
    resource: "attributes",
    action: "create",
  });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <AttributeFormFields />
      </Form>
    </Create>
  );
}
