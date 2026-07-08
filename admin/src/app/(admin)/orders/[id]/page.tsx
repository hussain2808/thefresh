"use client";

import { Show } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Descriptions, Table, Card, Tag, Typography, Space, Row, Col } from "antd";
import { formatAed } from "@/lib/money";
import { formatSlotTime, type Order, type OrderItem } from "@/types/orders";

export default function OrderShowPage() {
  const { query } = useShow<Order>({ resource: "orders" });
  const order = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading} title={order ? `Order ${order.id.slice(-8)}` : "Order"}>
      {order && (
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <Row gutter={16}>
            <Col span={12}>
              <Card title="Customer" size="small">
                <Descriptions column={1} size="small">
                  <Descriptions.Item label="Name">{order.customer?.name ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Email">{order.customer?.email ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Phone">{order.customer?.phone ?? "—"}</Descriptions.Item>
                  <Descriptions.Item label="Status">
                    <Tag>{order.status}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Placed">{new Date(order.createdAt).toLocaleString()}</Descriptions.Item>
                </Descriptions>
              </Card>
            </Col>
            <Col span={12}>
              <Card title="Delivery" size="small">
                {order.deliverySnapshot ? (
                  <Descriptions column={1} size="small">
                    <Descriptions.Item label="Method">{order.deliverySnapshot.methodName}</Descriptions.Item>
                    <Descriptions.Item label="Zone / Area">
                      {order.deliverySnapshot.zoneName} / {order.deliverySnapshot.areaName}
                    </Descriptions.Item>
                    <Descriptions.Item label="Fee">{formatAed(order.deliverySnapshot.deliveryFeeFils)}</Descriptions.Item>
                    <Descriptions.Item label="ETA">
                      {order.deliverySnapshot.etaMinutes
                        ? `${order.deliverySnapshot.etaMinutes} min`
                        : order.deliverySnapshot.slotStart != null && order.deliverySnapshot.slotEnd != null
                          ? `${formatSlotTime(order.deliverySnapshot.slotStart)} - ${formatSlotTime(order.deliverySnapshot.slotEnd)}${
                              order.deliverySnapshot.slotDate
                                ? ` on ${new Date(order.deliverySnapshot.slotDate).toLocaleDateString()}`
                                : ""
                            }`
                          : "—"}
                    </Descriptions.Item>
                    <Descriptions.Item label="Address">{order.deliverySnapshot.deliveryAddress}</Descriptions.Item>
                  </Descriptions>
                ) : (
                  <Typography.Text type="secondary">No delivery snapshot</Typography.Text>
                )}
              </Card>
            </Col>
          </Row>

          <Card title="Items" size="small">
            <Table<OrderItem> dataSource={order.items} rowKey="id" pagination={false} size="small">
              <Table.Column<OrderItem> title="Product" render={(_, r) => r.productName ?? r.variantId} />
              <Table.Column<OrderItem>
                title="Qty / Weight"
                render={(_, r) => (r.weightGrams ? `${r.weightGrams}g` : (r.quantity ?? 1))}
              />
              <Table.Column<OrderItem> title="Price" render={(_, r) => formatAed(r.estimatedPriceFils)} />
            </Table>
          </Card>

          <Card title="Totals" size="small">
            <Descriptions column={1} size="small">
              <Descriptions.Item label="Subtotal">{formatAed(order.subtotalFils)}</Descriptions.Item>
              {order.coupon && (
                <Descriptions.Item label={`Coupon (${order.coupon.code})`}>
                  − {formatAed(order.coupon.discountAmountFils)}
                </Descriptions.Item>
              )}
              {order.deliverySnapshot && (
                <Descriptions.Item label="Delivery fee">{formatAed(order.deliverySnapshot.deliveryFeeFils)}</Descriptions.Item>
              )}
              <Descriptions.Item label={<Typography.Text strong>Total</Typography.Text>}>
                <Typography.Text strong>{formatAed(order.totalFils)}</Typography.Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>
        </Space>
      )}
    </Show>
  );
}
