"use client";

import { Create, useForm } from "@refinedev/antd";
import { Form } from "antd";
import { CityFormFields } from "@/components/city-form-fields";
import type { City } from "@/types/delivery";

export default function CreateCityPage() {
  const { formProps, saveButtonProps } = useForm<City>({ resource: "cities", action: "create" });

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" style={{ maxWidth: 480 }}>
        <CityFormFields />
      </Form>
    </Create>
  );
}
