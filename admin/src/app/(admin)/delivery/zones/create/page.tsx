"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { ZoneFormFields } from "@/components/zone-form-fields";
import type { Zone } from "@/types/delivery";

export default function CreateZonePage() {
  const { formProps, saveButtonProps } = useForm<Zone>({ resource: "zones", action: "create" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <ZoneFormFields />
      </Form>
    </Create>
  );
}
