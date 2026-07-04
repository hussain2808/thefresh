"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, Tabs, Spin, Tag } from "antd";
import { apiFetch } from "@/lib/api-client";
import { STATUS_COLORS, type ProductFamily } from "@/types/catalog";
import { FamilyBasicInfoTab } from "@/components/family-basic-info-tab";
import { FamilyVariantsTab } from "@/components/family-variants-tab";
import { FamilyImagesTab } from "@/components/family-images-tab";
import { FamilyAttributesTab } from "@/components/family-attributes-tab";
import { FamilyPricingTab } from "@/components/family-pricing-tab";

export default function EditProductPage() {
  const { id } = useParams<{ id: string }>();
  const [family, setFamily] = useState<ProductFamily | null>(null);
  const [loading, setLoading] = useState(true);

  async function reload() {
    const data = await apiFetch<ProductFamily>(`/admin/catalog/families/${id}`);
    setFamily(data);
    setLoading(false);
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading || !family) {
    return <Spin size="large" style={{ marginTop: 64 }} />;
  }

  return (
    <Card
      title={
        <span>
          {family.name} <Tag color={STATUS_COLORS[family.status]}>{family.status}</Tag>
        </span>
      }
    >
      <Tabs
        defaultActiveKey="basic"
        items={[
          { key: "basic", label: "Basic Information", children: <FamilyBasicInfoTab family={family} onSaved={reload} /> },
          { key: "variants", label: "Variants", children: <FamilyVariantsTab family={family} onSaved={reload} /> },
          { key: "images", label: "Images", children: <FamilyImagesTab family={family} onSaved={reload} /> },
          { key: "attributes", label: "Attributes", children: <FamilyAttributesTab family={family} onSaved={reload} /> },
          { key: "pricing", label: "Pricing & Stock", children: <FamilyPricingTab family={family} onSaved={reload} /> },
        ]}
      />
    </Card>
  );
}
