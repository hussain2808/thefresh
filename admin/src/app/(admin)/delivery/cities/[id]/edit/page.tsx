"use client";

import { Edit, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { CityFormFields } from "@/components/city-form-fields";
import type { City } from "@/types/delivery";

export default function EditCityPage() {
  const { formProps, saveButtonProps } = useForm<City>({ resource: "cities", action: "edit" });

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <CityFormFields />
      </Form>
    </Edit>
  );
}
