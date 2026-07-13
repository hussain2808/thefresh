"use client";

import { AuthPage } from "@refinedev/antd";

export default function LoginPage() {
  return (
    <AuthPage
      type="login"
      title="TheFresh Admin"
      formProps={{
        // Testing convenience — hardcoded to the seeded admin account
        // (prisma/seed.ts). Remove before any non-local deployment.
        initialValues: { email: "test@thefresh.com", password: "password123" },
      }}
    />
  );
}
