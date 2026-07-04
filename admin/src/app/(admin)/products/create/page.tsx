"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSelect, useGetIdentity } from "@refinedev/core";
import {
  Steps,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Button,
  Space,
  Row,
  Col,
  Divider,
  Typography,
  App,
} from "antd";
import { apiFetch } from "@/lib/api-client";
import { toFils } from "@/lib/money";
import { WEIGHT_DISCLAIMER_DEFAULT, type Category, type Brand, type SellingType } from "@/types/catalog";

const SELLING_TYPES: { value: SellingType; label: string; hint: string }[] = [
  { value: "WEIGHT", label: "Weight", hint: "Sold by weight — customer pays for actual picked weight (e.g. produce, meat, fish)." },
  { value: "UNIT", label: "Unit", hint: "Sold as fixed pieces (e.g. bottled milk, toothbrush)." },
  { value: "VOLUME", label: "Volume", hint: "Dispensed/measured by volume (e.g. loose olive oil, fresh juice)." },
  { value: "PACK", label: "Pack", hint: "Sold as a multi-item pack (e.g. 24-pack water)." },
  { value: "BUNDLE", label: "Bundle", hint: "A fixed-price bundle of other products." },
];

interface Identity {
  role: string;
}

export default function CreateProductWizard() {
  const router = useRouter();
  const { message } = App.useApp();
  const { data: identity } = useGetIdentity<Identity>();
  const [current, setCurrent] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const [step1] = Form.useForm();
  const [step2] = Form.useForm();
  const [step3] = Form.useForm();
  const [step4] = Form.useForm();

  const { options: categoryOptions } = useSelect<Category>({
    resource: "categories",
    optionLabel: "name",
    optionValue: "id",
  });
  const { options: brandOptions } = useSelect<Brand>({
    resource: "brands",
    optionLabel: "name",
    optionValue: "id",
  });

  const [sellingType, setSellingType] = useState<SellingType>("WEIGHT");

  function handleSellingTypeChange(value: SellingType) {
    setSellingType(value);
    if (value === "WEIGHT" && !step2.getFieldValue("disclaimer")) {
      step2.setFieldValue("disclaimer", WEIGHT_DISCLAIMER_DEFAULT);
    }
  }

  async function next() {
    const forms = [step1, step2, step3, step4];
    await forms[current].validateFields();
    setCurrent((c) => c + 1);
  }

  function back() {
    setCurrent((c) => c - 1);
  }

  async function publish(status: "DRAFT" | "ACTIVE") {
    setSubmitting(true);
    try {
      const s1 = step1.getFieldsValue();
      const s2 = step2.getFieldsValue();
      const s3 = step3.getFieldsValue();
      const s4 = step4.getFieldsValue();

      const family = await apiFetch<{ id: string }>("/admin/catalog/families", {
        method: "POST",
        body: JSON.stringify({
          name: s2.name,
          slug: s2.slug,
          description: s2.description,
          specification: s2.specification,
          disclaimer: s2.disclaimer,
          categoryId: s1.categoryId,
          brandId: s1.brandId,
          status: "DRAFT",
        }),
      });

      const variantPayload: Record<string, unknown> = {
        sku: s3.sku,
        barcode: s3.barcode,
        name: s3.variantName,
        sellingType,
        netContentValue: s3.netContentValue,
        netContentUnit: s3.netContentUnit,
      };
      if (sellingType === "WEIGHT") {
        if (s3.displayWeightGrams || s3.wastePercent) {
          variantPayload.weightRule = {
            displayWeightGrams: s3.displayWeightGrams,
            wastePercent: s3.wastePercent,
          };
        }
        variantPayload.weightOptions = (s3.weightOptions ?? []).map(
          (o: { weightGrams: number; modifierPercent?: number; label?: string }) => ({
            weightGrams: o.weightGrams,
            modifierPercent: o.modifierPercent ?? 0,
            label: o.label,
          }),
        );
      }
      const variant = await apiFetch<{ id: string }>(`/admin/catalog/families/${family.id}/variants`, {
        method: "POST",
        body: JSON.stringify(variantPayload),
      });

      await apiFetch("/admin/listings", {
        method: "POST",
        body: JSON.stringify({
          variantId: variant.id,
          priceFils: toFils(s4.priceAed),
          enabled: status === "ACTIVE",
          lowStockThreshold: s4.lowStockThreshold ?? 0,
          initialStockQty: s4.initialStockQty ?? 0,
        }),
      });

      if (status === "ACTIVE") {
        await apiFetch(`/admin/catalog/families/${family.id}`, {
          method: "PATCH",
          body: JSON.stringify({ status: "ACTIVE" }),
        });
      }

      message.success(status === "ACTIVE" ? "Product published" : "Draft saved");
      router.push(`/products/${family.id}/edit`);
    } catch (error) {
      message.error(error instanceof Error ? error.message : "Failed to create product");
    } finally {
      setSubmitting(false);
    }
  }

  const isAdmin = identity?.role === "ADMIN";

  return (
    <Card title="New product">
      <Steps
        current={current}
        items={[
          { title: "Category & Type" },
          { title: "Basic Info" },
          { title: "Variant" },
          { title: "Pricing & Stock" },
          { title: "Review" },
        ]}
        style={{ marginBottom: 32 }}
      />

      <div style={{ display: current === 0 ? "block" : "none" }}>
        <Form form={step1} layout="vertical" style={{ maxWidth: 480 }}>
          <Form.Item label="Category" name="categoryId" rules={[{ required: true }]}>
            <Select options={categoryOptions} showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="Brand" name="brandId" tooltip="Optional — produce and loose goods usually have no brand.">
            <Select options={brandOptions} allowClear showSearch optionFilterProp="label" />
          </Form.Item>
          <Form.Item label="Selling type" name="sellingType" initialValue="WEIGHT" rules={[{ required: true }]}>
            <Select
              value={sellingType}
              onChange={handleSellingTypeChange}
              options={SELLING_TYPES.map((t) => ({ label: t.label, value: t.value }))}
            />
          </Form.Item>
          <Typography.Text type="secondary">
            {SELLING_TYPES.find((t) => t.value === sellingType)?.hint}
          </Typography.Text>
        </Form>
      </div>

      <div style={{ display: current === 1 ? "block" : "none" }}>
        <Form form={step2} layout="vertical" style={{ maxWidth: 480 }}>
          <Form.Item label="Name" name="name" rules={[{ required: true }]}>
            <Input placeholder="e.g. Banana" />
          </Form.Item>
          <Form.Item label="Slug" name="slug" rules={[{ required: true }]} tooltip="URL-friendly, must be unique.">
            <Input placeholder="e.g. banana" />
          </Form.Item>
          <Form.Item label="Description" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item label="Specification" name="specification" tooltip="General product info shown as regular text.">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item
            label="Disclaimer"
            name="disclaimer"
            tooltip="Rendered prominently on the storefront. Pre-filled for weight-billed products, but fully editable."
          >
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </div>

      <div style={{ display: current === 2 ? "block" : "none" }}>
        <Form form={step3} layout="vertical" style={{ maxWidth: 640 }}>
          <Row gutter={24}>
            <Col span={12}>
              <Form.Item label="SKU" name="sku" rules={[{ required: true }]}>
                <Input placeholder="e.g. BANANA-KG" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item label="Barcode" name="barcode">
                <Input />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                label="Variant name"
                name="variantName"
                rules={[{ required: true }]}
                initialValue={sellingType === "WEIGHT" ? "By weight" : undefined}
              >
                <Input placeholder={sellingType === "WEIGHT" ? "By weight" : "e.g. 1L"} />
              </Form.Item>
            </Col>
            {sellingType !== "WEIGHT" && (
              <>
                <Col span={12}>
                  <Form.Item label="Net content value" name="netContentValue">
                    <InputNumber style={{ width: "100%" }} placeholder="e.g. 1000" />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item label="Net content unit" name="netContentUnit">
                    <Input placeholder="e.g. ml" />
                  </Form.Item>
                </Col>
              </>
            )}
          </Row>

          {sellingType === "WEIGHT" && (
            <>
              <Divider />
              <Typography.Title level={5}>Purchase presets</Typography.Title>
              <Form.List name="weightOptions" initialValue={[{ weightGrams: 1000, label: "1kg", modifierPercent: 0 }]}>
                {(fields, { add, remove }) => (
                  <Space direction="vertical" style={{ width: "100%" }}>
                    {fields.map((field) => (
                      <Space key={field.key} align="baseline" wrap>
                        <Form.Item
                          {...field}
                          name={[field.name, "label"]}
                          rules={[{ required: true, message: "Label" }]}
                        >
                          <Input placeholder="Label, e.g. 1kg" style={{ width: 140 }} />
                        </Form.Item>
                        <Form.Item
                          {...field}
                          name={[field.name, "weightGrams"]}
                          rules={[{ required: true, message: "Grams" }]}
                        >
                          <InputNumber placeholder="Grams" addonAfter="g" style={{ width: 140 }} />
                        </Form.Item>
                        <Form.Item {...field} name={[field.name, "modifierPercent"]} initialValue={0}>
                          <InputNumber placeholder="Modifier" addonAfter="%" style={{ width: 130 }} />
                        </Form.Item>
                        <Button danger size="small" onClick={() => remove(field.name)}>
                          Remove
                        </Button>
                      </Space>
                    ))}
                    <Button type="dashed" onClick={() => add({ modifierPercent: 0 })}>
                      + Add preset
                    </Button>
                  </Space>
                )}
              </Form.List>

              <Divider />
              <Row gutter={24}>
                <Col span={12}>
                  <Form.Item
                    label="Display weight (g)"
                    name="displayWeightGrams"
                    tooltip="Optional — psychological pricing. Must match one of the presets above (e.g. 500 to headline the 500g price instead of the per-kg price)."
                  >
                    <InputNumber addonAfter="g" style={{ width: "100%" }} />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item
                    label="Waste %"
                    name="wastePercent"
                    tooltip="For products like fish sold on pre-cleaning weight."
                  >
                    <InputNumber min={0} max={100} style={{ width: "100%" }} addonAfter="%" />
                  </Form.Item>
                </Col>
              </Row>
            </>
          )}
        </Form>
      </div>

      <div style={{ display: current === 3 ? "block" : "none" }}>
        <Form form={step4} layout="vertical" style={{ maxWidth: 480 }}>
          <Form.Item
            label={sellingType === "WEIGHT" ? "Price (AED per kg)" : "Price (AED)"}
            name="priceAed"
            rules={[{ required: true }]}
          >
            <InputNumber min={0} step={0.01} style={{ width: "100%" }} />
          </Form.Item>
          <Form.Item
            label={sellingType === "WEIGHT" ? "Initial stock (kg)" : "Initial stock (units)"}
            name="initialStockQtyDisplay"
            tooltip="Recorded as a RECEIVE stock movement."
          >
            <InputNumber
              min={0}
              step={sellingType === "WEIGHT" ? 0.1 : 1}
              style={{ width: "100%" }}
              onChange={(v) =>
                step4.setFieldValue(
                  "initialStockQty",
                  sellingType === "WEIGHT" ? Math.round((v ?? 0) * 1000) : v,
                )
              }
            />
          </Form.Item>
          <Form.Item name="initialStockQty" hidden>
            <InputNumber />
          </Form.Item>
          <Form.Item label="Low stock threshold" name="lowStockThreshold" initialValue={0}>
            <InputNumber min={0} style={{ width: "100%" }} />
          </Form.Item>
        </Form>
      </div>

      <div style={{ display: current === 4 ? "block" : "none" }}>
        <Typography.Paragraph>
          Review the details in the previous steps, then save as a draft or publish immediately.
          Publishing requires a category, at least one variant, and a priced listing — all of
          which this wizard has set up.
        </Typography.Paragraph>
      </div>

      <Divider />
      <Space>
        {current > 0 && <Button onClick={back}>Back</Button>}
        {current < 4 && (
          <Button type="primary" onClick={next}>
            Next
          </Button>
        )}
        {current === 4 && (
          <>
            <Button onClick={() => publish("DRAFT")} loading={submitting}>
              Save as draft
            </Button>
            <Button type="primary" onClick={() => publish("ACTIVE")} loading={submitting} disabled={!isAdmin}>
              Publish
            </Button>
          </>
        )}
      </Space>
    </Card>
  );
}
