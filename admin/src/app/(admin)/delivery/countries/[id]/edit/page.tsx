"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { CountryFormFields } from "@/components/country-form-fields";
import type { Country } from "@/types/delivery";

export default function EditCountryPage() {
  const { formProps, saveButtonProps } = useForm<Country>({ resource: "countries", action: "edit" });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <CountryFormFields />
      </Form>
    </Edit>
  );
}
