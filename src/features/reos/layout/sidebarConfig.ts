/**
 * Sidebar route configuration - split out of Sidebar.tsx (2026-08-13, Production
 * Readiness Phase 4) so that file exports only the `Sidebar` component. Fast Refresh
 * only works when a file exports components alone; sharing this data/function from the
 * same file as the component defeated it for every edit to Sidebar.tsx.
 */
export type SidebarItem = {
  label: string;
  href: string;
  match: RegExp;
};

export type SidebarSection = {
  label: string;
  items: SidebarItem[];
};

export const sidebarSections: SidebarSection[] = [
  {
    label: "Operations",
    items: [
      {
        label: "Dashboard",
        href: "/reos/dashboard",
        match: /^\/reos\/dashboard$/,
      },
      {
        label: "Reports",
        href: "/reos/reports",
        match: /^\/reos\/reports$/,
      },
      {
        label: "Branch Processing",
        href: "/reos/branches/BRANCH_ID/processing",
        match: /^\/reos\/branches\/[^/]+\/processing$/,
      },
    ],
  },
  {
    label: "Liquidity",
    items: [
      {
        label: "Liquidity Dashboard",
        href: "/reos/liquidity/dashboard",
        match: /^\/reos\/liquidity\/dashboard$/,
      },
      {
        label: "Liquidity Management",
        href: "/reos/liquidity",
        match: /^\/reos\/liquidity$/,
      },
    ],
  },
  {
    label: "Shared Batches",
    items: [
      {
        label: "Upload",
        href: "/reos/shared-batches/upload",
        match: /^\/reos\/shared-batches\/upload$/,
      },
      {
        label: "Assignment",
        href: "/reos/shared-batches/assignment",
        match: /^\/reos\/shared-batches\/assignment$/,
      },
      {
        label: "Proof Download",
        href: "/reos/shared-batches/BATCH_ID/proof-download",
        match: /^\/reos\/shared-batches\/[^/]+\/proof-download$/,
      },
    ],
  },
  {
    label: "Operational Data",
    items: [
      {
        label: "Import Intelligence",
        href: "/reos/import-intelligence",
        match: /^\/reos\/import-intelligence$/,
      },
      {
        label: "Data Coverage",
        href: "/reos/import-intelligence/coverage",
        match: /^\/reos\/import-intelligence\/coverage$/,
      },
      {
        label: "Import History",
        href: "/reos/import-intelligence/history",
        match: /^\/reos\/import-intelligence\/history(\/[^/]+)?$/,
      },
      {
        label: "Duplicate Management",
        href: "/reos/import-intelligence/duplicates",
        match: /^\/reos\/import-intelligence\/duplicates$/,
      },
      {
        label: "Historical Performance",
        href: "/reos/import-intelligence/performance",
        match: /^\/reos\/import-intelligence\/performance$/,
      },
    ],
  },
  {
    label: "Administration",
    items: [
      {
        label: "Users",
        href: "/reos/administration/users",
        match: /^\/reos\/administration\/users$/,
      },
      {
        label: "Create User",
        href: "/reos/administration/users/create",
        match: /^\/reos\/administration\/users\/create$/,
      },
      {
        label: "User Details",
        href: "/reos/administration/users/USER_ID",
        match: /^\/reos\/administration\/users\/[^/]+$/,
      },
      {
        label: "Edit User",
        href: "/reos/administration/users/USER_ID/edit",
        match: /^\/reos\/administration\/users\/[^/]+\/edit$/,
      },
    ],
  },
];

export function getActiveSidebarItem(pathname: string): SidebarItem | undefined {
  return sidebarSections.flatMap((section) => section.items).find((item) => item.match.test(pathname));
}
