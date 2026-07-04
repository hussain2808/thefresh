"use client";

import { AuthPage } from "@refinedev/antd";

export default function LoginPage() {
  return (
    <AuthPage
      type="login"
      title="TheFresh Admin"
      formProps={{
        initialValues: { email: "", password: "" },
      }}
    />
  );
}
