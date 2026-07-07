"use client";

import { Suspense } from "react";
import { Refine } from "@refinedev/core";
import { useNotificationProvider } from "@refinedev/antd";
import { ConfigProvider, App as AntdApp, Spin } from "antd";
import routerProvider from "@refinedev/nextjs-router/app";
import {
  BadgeCheck,
  Boxes,
  Clock,
  ListChecks,
  Map,
  MapPin,
  PackageSearch,
  Store,
  Tags,
  Ticket,
  Truck,
} from "lucide-react";
import { dataProvider } from "./data-provider";
import { authProvider } from "./auth-provider";
import { theme } from "./theme";

function RefineApp({ children }: { children: React.ReactNode }) {
  const notificationProvider = useNotificationProvider();

  return (
    <Refine
      dataProvider={dataProvider}
      authProvider={authProvider}
      routerProvider={routerProvider}
      notificationProvider={notificationProvider}
      resources={[
        {
          name: "catalog",
          meta: { label: "Catalog" },
        },
        {
          name: "products",
          list: "/products",
          create: "/products/create",
          edit: "/products/:id/edit",
          meta: { label: "Products", icon: <Boxes size={16} />, parent: "catalog" },
        },
        {
          name: "categories",
          list: "/categories",
          create: "/categories/create",
          edit: "/categories/:id/edit",
          meta: { label: "Categories", icon: <Tags size={16} />, parent: "catalog" },
        },
        {
          name: "brands",
          list: "/brands",
          create: "/brands/create",
          edit: "/brands/:id/edit",
          meta: { label: "Brands", icon: <BadgeCheck size={16} />, parent: "catalog" },
        },
        {
          name: "attributes",
          list: "/attributes",
          create: "/attributes/create",
          edit: "/attributes/:id/edit",
          meta: { label: "Attributes", icon: <ListChecks size={16} />, parent: "catalog" },
        },
        {
          name: "store-ops",
          meta: { label: "Store Ops" },
        },
        {
          name: "listings",
          list: "/store/listings",
          meta: { label: "Assortment & Pricing", icon: <Store size={16} />, parent: "store-ops" },
        },
        {
          name: "inventory",
          list: "/store/inventory",
          meta: { label: "Inventory", icon: <PackageSearch size={16} />, parent: "store-ops" },
        },
        {
          name: "delivery",
          meta: { label: "Delivery" },
        },
        {
          name: "countries",
          list: "/delivery/countries",
          create: "/delivery/countries/create",
          edit: "/delivery/countries/:id/edit",
          meta: { label: "Countries", icon: <Map size={16} />, parent: "delivery" },
        },
        {
          name: "cities",
          list: "/delivery/cities",
          create: "/delivery/cities/create",
          edit: "/delivery/cities/:id/edit",
          meta: { label: "Cities", icon: <Map size={16} />, parent: "delivery" },
        },
        {
          name: "zones",
          list: "/delivery/zones",
          create: "/delivery/zones/create",
          edit: "/delivery/zones/:id/edit",
          meta: { label: "Zones", icon: <MapPin size={16} />, parent: "delivery" },
        },
        {
          name: "areas",
          list: "/delivery/areas",
          create: "/delivery/areas/create",
          edit: "/delivery/areas/:id/edit",
          meta: { label: "Areas", icon: <MapPin size={16} />, parent: "delivery" },
        },
        {
          name: "delivery-methods",
          list: "/delivery/methods",
          create: "/delivery/methods/create",
          edit: "/delivery/methods/:id/edit",
          meta: { label: "Delivery Methods", icon: <Truck size={16} />, parent: "delivery" },
        },
        {
          name: "delivery-slots",
          list: "/delivery/slots",
          meta: { label: "Slot Management", icon: <Clock size={16} />, parent: "delivery" },
        },
        {
          name: "promotions",
          meta: { label: "Promotions" },
        },
        {
          name: "coupons",
          list: "/promotions/coupons",
          create: "/promotions/coupons/create",
          edit: "/promotions/coupons/:id/edit",
          meta: { label: "Coupons", icon: <Ticket size={16} />, parent: "promotions" },
        },
      ]}
      options={{ syncWithLocation: true, warnWhenUnsavedChanges: false, disableTelemetry: true }}
    >
      {children}
    </Refine>
  );
}

// This inner boundary is required because @refinedev/nextjs-router calls
// useSearchParams() — kept as small as possible (and rendered inside
// ConfigProvider/AntdApp, not around them) so the fallback itself is
// still themed instead of a bare unstyled flash on hard page loads.
function SuspendedRefineApp({ children }: { children: React.ReactNode }) {
  return (
    <Suspense
      fallback={
        <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
          <Spin size="large" />
        </div>
      }
    >
      <RefineApp>{children}</RefineApp>
    </Suspense>
  );
}

export function AppRefineProvider({ children }: { children: React.ReactNode }) {
  return (
    <ConfigProvider theme={theme}>
      <AntdApp>
        <RefineApp>{children}</RefineApp>
      </AntdApp>
    </ConfigProvider>
  );
}
