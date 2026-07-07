"use client";

import { List, useTable, EditButton, DeleteButton, CreateButton } from "@refinedev/antd";
import { Table, Space, Empty, Tag } from "antd";
import { formatAed } from "@/lib/money";
import type { Coupon } from "@/types/promotions";

function rewardSummary(coupon: Coupon): string {
  const reward = coupon.promotion.rewards[0];
  if (!reward) return "—";
  switch (reward.rewardType) {
    case "FIXED_DISCOUNT":
      return `${formatAed(reward.value)} off`;
    case "PERCENTAGE_DISCOUNT":
      return `${reward.value}% off${reward.maxDiscountFils ? ` (max ${formatAed(reward.maxDiscountFils)})` : ""}`;
    case "FREE_DELIVERY":
      return "Free delivery";
    default:
      return reward.rewardType;
  }
}

export default function CouponsListPage() {
  const { tableProps } = useTable<Coupon>({ resource: "coupons", pagination: { mode: "off" } });

  return (
    <List headerButtons={<CreateButton />}>
      <Table
        {...tableProps}
        rowKey="promotionId"
        size="middle"
        locale={{ emptyText: <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="No coupons yet" /> }}
      >
        <Table.Column<Coupon> title="Code" dataIndex="code" render={(v) => <Tag color="blue">{v}</Tag>} />
        <Table.Column<Coupon> title="Name" render={(_, r) => r.promotion.name} />
        <Table.Column<Coupon> title="Reward" render={(_, r) => rewardSummary(r)} />
        <Table.Column<Coupon>
          title="Usage limit"
          render={(_, r) => (r.usageLimit ? r.usageLimit : "Unlimited")}
        />
        <Table.Column<Coupon>
          title="Per customer"
          render={(_, r) => (r.perUserLimit ? r.perUserLimit : "Unlimited")}
        />
        <Table.Column<Coupon>
          title="Status"
          render={(_, r) => {
            const color = r.promotion.status === "ACTIVE" ? "green" : r.promotion.status === "PAUSED" ? "orange" : "default";
            return <Tag color={color}>{r.promotion.status}</Tag>;
          }}
        />
        <Table.Column<Coupon>
          title="Actions"
          fixed="right"
          width={140}
          render={(_, record) => (
            <Space>
              <EditButton size="small" recordItemId={record.promotionId} />
              <DeleteButton size="small" recordItemId={record.promotionId} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}
