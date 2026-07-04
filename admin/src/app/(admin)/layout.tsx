"use client";

import { ThemedLayout, ThemedTitle } from "@refinedev/antd";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <ThemedLayout Title={(props) => <ThemedTitle {...props} text="TheFresh Admin" />}>
      {children}
    </ThemedLayout>
  );
}
