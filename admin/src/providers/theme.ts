import type { ThemeConfig } from "antd";

// Operations-platform look: crisp, low-chroma neutrals with a single confident
// brand accent (green, for "TheFresh"). Tuned for daily use by ops/warehouse
// staff, not a marketing surface — favors clarity and density over flourish.
export const theme: ThemeConfig = {
  token: {
    colorPrimary: "#16803D",
    colorLink: "#16803D",
    borderRadius: 6,
    fontFamily:
      "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    fontSize: 14,
    colorBgLayout: "#F5F6F8",
    colorBorderSecondary: "#E5E7EB",
    boxShadowTertiary:
      "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02), 0 2px 4px 0 rgba(0,0,0,0.02)",
  },
  components: {
    Layout: {
      siderBg: "#FFFFFF",
      headerBg: "#FFFFFF",
      headerPadding: "0 24px",
    },
    Menu: {
      itemBorderRadius: 6,
      itemMarginInline: 8,
      itemSelectedBg: "#EAF5EE",
      itemSelectedColor: "#16803D",
      itemHoverBg: "#F5F6F8",
      itemHoverColor: "#111827",
      subMenuItemBg: "transparent",
    },
    Table: {
      headerBg: "#FAFAFA",
      headerColor: "#61656C",
      headerSplitColor: "transparent",
      rowHoverBg: "#F5FBF7",
      cellPaddingBlock: 10,
    },
    Card: {
      borderRadiusLG: 8,
      boxShadowTertiary:
        "0 1px 2px 0 rgba(0,0,0,0.03), 0 1px 6px -1px rgba(0,0,0,0.02)",
    },
    Breadcrumb: {
      fontSize: 13,
    },
  },
};
