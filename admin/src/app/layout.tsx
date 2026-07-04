import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { AppRefineProvider } from "@/providers/refine-provider";
import "@refinedev/antd/dist/reset.css";

export const metadata: Metadata = {
  title: "TheFresh Admin",
  description: "Admin portal for TheFresh",
};

// Every route here is behind auth and needs live data — nothing benefits from
// static prerendering, and static generation would defer the Suspense-wrapped
// Refine/Antd tree (needed for useSearchParams) to client-only rendering,
// causing a flash of unstyled content on first load.
export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <AntdRegistry>
          <AppRefineProvider>{children}</AppRefineProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
