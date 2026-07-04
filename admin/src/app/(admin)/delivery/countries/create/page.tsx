"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { CountryFormFields } from "@/components/country-form-fields";
import type { Country } from "@/types/delivery";

export default function CreateCountryPage() {
  const { formProps, saveButtonProps } = useForm<Country>({ resource: "countries", action: "create" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <CountryFormFields />
      </Form>
    </Create>
  );
}
