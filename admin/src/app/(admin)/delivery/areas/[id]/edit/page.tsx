"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { AreaFormFields } from "@/components/area-form-fields";
import type { Area } from "@/types/delivery";

export default function EditAreaPage() {
  const { formProps, saveButtonProps } = useForm<Area>({ resource: "areas", action: "edit" });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <AreaFormFields />
      </Form>
    </Edit>
  );
}
