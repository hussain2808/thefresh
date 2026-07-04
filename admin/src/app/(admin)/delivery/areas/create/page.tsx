"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { AreaFormFields } from "@/components/area-form-fields";
import type { Area } from "@/types/delivery";

export default function CreateAreaPage() {
  const { formProps, saveButtonProps } = useForm<Area>({ resource: "areas", action: "create" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <AreaFormFields />
      </Form>
    </Create>
  );
}
