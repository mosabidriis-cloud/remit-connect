import type { ReosUserRole } from "../types/user";

/**
 * Sidebar route configuration - split out of Sidebar.tsx (2026-08-13, Production
 * Readiness Phase 4) so that file exports only the `Sidebar` component. Fast Refresh
 * only works when a file exports components alone; sharing this data/function from the
 * same file as the component defeated it for every edit to Sidebar.tsx.
 *
 * `roles` on each item must match the real access boundary enforced in AppRoutes.tsx /
 * RouteGuards.tsx exactly - this list does not grant access, it only decides visibility
 * of a link the route guard would already allow. Keeping it hand-aligned rather than
 * derived from the route table is a deliberate, small duplication (2026-08-17): the two
 * live in different files for different reasons (routing vs. navigation), and a shared
 * source would be a larger refactor than this fix calls for.
 */
const OM: ReosUserRole[] = ["OPERATIONS_MANAGER"];
const DRO_OR_OM: ReosUserRole[] = ["DIRECT_REMIT_OFFICER", "OPERATIONS_MANAGER"];
const BRANCH_OFFICER_OR_OM: ReosUserRole[] = ["BRANCH_OFFICER", "OPERATIONS_MANAGER"];

export type SidebarItem = {
  label: string;
  href: string;
  match: RegExp;
  roles: ReosUserRole[];
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
        roles: OM,
      },
      {
        label: "Reports",
        href: "/reos/reports",
        match: /^\/reos\/reports$/,
        roles: OM,
      },
      {
        label: "Branch Processing",
        href: "/reos/branches/BRANCH_ID/processing",
        match: /^\/reos\/branches\/[^/]+\/processing$/,
        roles: BRANCH_OFFICER_OR_OM,
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
        roles: OM,
      },
      {
        label: "Liquidity Management",
        href: "/reos/liquidity",
        match: /^\/reos\/liquidity$/,
        roles: OM,
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
        roles: DRO_OR_OM,
      },
      {
        label: "Assignment",
        href: "/reos/shared-batches/assignment",
        match: /^\/reos\/shared-batches\/assignment$/,
        roles: DRO_OR_OM,
      },
      {
        label: "Proof Download",
        href: "/reos/shared-batches/BATCH_ID/proof-download",
        match: /^\/reos\/shared-batches\/[^/]+\/proof-download$/,
        roles: DRO_OR_OM,
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
        roles: DRO_OR_OM,
      },
      {
        label: "Data Coverage",
        href: "/reos/import-intelligence/coverage",
        match: /^\/reos\/import-intelligence\/coverage$/,
        roles: DRO_OR_OM,
      },
      {
        label: "Import History",
        href: "/reos/import-intelligence/history",
        match: /^\/reos\/import-intelligence\/history(\/[^/]+)?$/,
        roles: DRO_OR_OM,
      },
      {
        label: "Duplicate Management",
        href: "/reos/import-intelligence/duplicates",
        match: /^\/reos\/import-intelligence\/duplicates$/,
        roles: DRO_OR_OM,
      },
      {
        label: "Historical Performance",
        href: "/reos/import-intelligence/performance",
        match: /^\/reos\/import-intelligence\/performance$/,
        roles: DRO_OR_OM,
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
        roles: OM,
      },
      {
        label: "Create User",
        href: "/reos/administration/users/create",
        match: /^\/reos\/administration\/users\/create$/,
        roles: OM,
      },
      {
        label: "User Details",
        href: "/reos/administration/users/USER_ID",
        match: /^\/reos\/administration\/users\/[^/]+$/,
        roles: OM,
      },
      {
        label: "Edit User",
        href: "/reos/administration/users/USER_ID/edit",
        match: /^\/reos\/administration\/users\/[^/]+\/edit$/,
        roles: OM,
      },
    ],
  },
];

export function getActiveSidebarItem(pathname: string): SidebarItem | undefined {
  return sidebarSections.flatMap((section) => section.items).find((item) => item.match.test(pathname));
}

export function getVisibleSidebarSections(role: ReosUserRole): SidebarSection[] {
  return sidebarSections
    .map((section) => ({ ...section, items: section.items.filter((item) => item.roles.includes(role)) }))
    .filter((section) => section.items.length > 0);
}
