import type {
  Branch,
  BranchLiquidity,
  BranchStatus,
  LiquidityHealth,
} from "../types/Branch";

type BranchSeed = Omit<Branch, "liquidity"> & {
  usdBalance: number;
  sdgBalance: number;
  liquidityLimit: number;
};

function buildBranchLiquidity(
  usdBalance: number,
  sdgBalance: number,
  liquidityLimit: number
): BranchLiquidity {
  const safeUsdBalance = Math.max(0, usdBalance);
  const safeSdgBalance = Math.max(0, sdgBalance);
  const safeLiquidityLimit = Math.max(0, liquidityLimit);
  const availableLiquidity = safeSdgBalance;
  const minimumThreshold =
    safeLiquidityLimit > 0 ? safeLiquidityLimit * 0.7 : 0;
  const percentage =
    safeLiquidityLimit > 0 ? (availableLiquidity / safeLiquidityLimit) * 100 : 0;

  let health: LiquidityHealth = "Healthy";
  if (percentage < 40) {
    health = "Critical";
  } else if (percentage < 70) {
    health = "Warning";
  }

  const isBelowThreshold = availableLiquidity < minimumThreshold;
  const alertLevel =
    !isBelowThreshold ? "None" : health === "Critical" ? "Critical" : "Warning";

  return {
    usdBalance: safeUsdBalance,
    sdgBalance: safeSdgBalance,
    liquidityLimit: safeLiquidityLimit,
    minimumThreshold,
    availableLiquidity,
    health,
    isBelowThreshold,
    alertLevel,
  };
}

function createBranch(seed: BranchSeed): Branch {
  return {
    ...seed,
    liquidity: buildBranchLiquidity(
      seed.usdBalance,
      seed.sdgBalance,
      seed.liquidityLimit
    ),
  };
}

const branchSeeds: BranchSeed[] = [
  {
    id: 1,
    code: "PS-001",
    name: "Port Sudan Branch",
    manager: "Amin Hassan",
    city: "Port Sudan",
    state: "Red Sea",
    phone: "+249 912 345 678",
    email: "port.sudan@remitconnect.sd",
    availableAccounts: 3.0,
    filesReady: 24,
    status: "Ready",
    usdBalance: 1250000,
    sdgBalance: 45000000,
    liquidityLimit: 60000000,
    services: ["Cash Pickup", "Account Funding", "Remittance"],
    lastUpdated: "09:15",
    active: true,
  },
  {
    id: 2,
    code: "SH-002",
    name: "Shandi Branch",
    manager: "Mona Yusuf",
    city: "Shandi",
    state: "River Nile",
    phone: "+249 911 222 333",
    email: "shandi@remitconnect.sd",
    availableAccounts: 1.2,
    filesReady: 14,
    status: "Funding Soon",
    usdBalance: 480000,
    sdgBalance: 18000000,
    liquidityLimit: 25000000,
    services: ["Cash Pickup", "Remittance"],
    lastUpdated: "09:12",
    active: true,
  },
  {
    id: 3,
    code: "DN-003",
    name: "Dongola Branch",
    manager: "Yasir Ibrahim",
    city: "Dongola",
    state: "Northern",
    phone: "+249 918 555 444",
    email: "dongola@remitconnect.sd",
    availableAccounts: 0.47,
    filesReady: 11,
    status: "Urgent Funding",
    usdBalance: 220000,
    sdgBalance: 7000000,
    liquidityLimit: 12000000,
    services: ["Account Funding", "Remittance"],
    lastUpdated: "09:09",
    active: true,
  },
  {
    id: 4,
    code: "KS-004",
    name: "Kassala Branch",
    manager: "Sara Ali",
    city: "Kassala",
    state: "Kassala",
    phone: "+249 915 777 888",
    email: "kassala@remitconnect.sd",
    availableAccounts: 2.4,
    filesReady: 19,
    status: "Ready",
    usdBalance: 980000,
    sdgBalance: 36000000,
    liquidityLimit: 48000000,
    services: ["Cash Pickup", "Account Funding", "Mobile Wallet"],
    lastUpdated: "09:05",
    active: true,
  },
  {
    id: 5,
    code: "AT-005",
    name: "Atbara Branch",
    manager: "Osman Khalid",
    city: "Atbara",
    state: "River Nile",
    phone: "+249 912 444 111",
    email: "atbara@remitconnect.sd",
    availableAccounts: 1.67,
    filesReady: 9,
    status: "Funding Soon",
    usdBalance: 640000,
    sdgBalance: 25000000,
    liquidityLimit: 30000000,
    services: ["Cash Pickup", "Remittance"],
    lastUpdated: "09:01",
    active: true,
  },
  {
    id: 6,
    code: "AW-006",
    name: "Alwady Branch",
    manager: "Huda Farah",
    city: "Alwady",
    state: "White Nile",
    phone: "+249 913 666 777",
    email: "alwady@remitconnect.sd",
    availableAccounts: 3.47,
    filesReady: 6,
    status: "Ready",
    usdBalance: 1500000,
    sdgBalance: 52000000,
    liquidityLimit: 65000000,
    services: ["Cash Pickup", "Account Funding", "Remittance", "Compliance"],
    lastUpdated: "08:58",
    active: true,
  },
  {
    id: 7,
    code: "HS-007",
    name: "Hasahessa Branch",
    manager: "Nadia Salim",
    city: "Hasahessa",
    state: "North Kordofan",
    phone: "+249 917 333 222",
    email: "hasahessa@remitconnect.sd",
    availableAccounts: 0.8,
    filesReady: 16,
    status: "Urgent Funding",
    usdBalance: 360000,
    sdgBalance: 12000000,
    liquidityLimit: 20000000,
    services: ["Remittance", "Account Funding"],
    lastUpdated: "08:55",
    active: true,
  },
  {
    id: 8,
    code: "GD-008",
    name: "Gadaref Branch",
    manager: "Ibrahim Khatir",
    city: "Gadaref",
    state: "Gadaref",
    phone: "+249 911 999 000",
    email: "gadaref@remitconnect.sd",
    availableAccounts: 2.0,
    filesReady: 13,
    status: "Funding Soon",
    usdBalance: 860000,
    sdgBalance: 30000000,
    liquidityLimit: 40000000,
    services: ["Cash Pickup", "Remittance", "Mobile Wallet"],
    lastUpdated: "08:52",
    active: true,
  },
  {
    id: 9,
    code: "MD-009",
    name: "Madani Branch",
    manager: "Laila Mohan",
    city: "Madani",
    state: "Gazira",
    phone: "+249 914 121 212",
    email: "madani@remitconnect.sd",
    availableAccounts: 3.13,
    filesReady: 18,
    status: "Ready",
    usdBalance: 1280000,
    sdgBalance: 47000000,
    liquidityLimit: 60000000,
    services: ["Cash Pickup", "Account Funding", "Remittance", "Compliance"],
    lastUpdated: "08:48",
    active: true,
  },
  {
    id: 10,
    code: "KO-010",
    name: "Kosti Branch",
    manager: "Bakri Abu",
    city: "Kosti",
    state: "White Nile",
    phone: "+249 911 767 676",
    email: "kosti@remitconnect.sd",
    availableAccounts: 0.6,
    filesReady: 8,
    status: "Urgent Funding",
    usdBalance: 290000,
    sdgBalance: 9000000,
    liquidityLimit: 15000000,
    services: ["Remittance", "Mobile Wallet"],
    lastUpdated: "08:44",
    active: true,
  },
  {
    id: 11,
    code: "OB-011",
    name: "Obaied Branch",
    manager: "Mubarak Noor",
    city: "Obaied",
    state: "North Kordofan",
    phone: "+249 918 444 555",
    email: "obaied@remitconnect.sd",
    availableAccounts: 1.4,
    filesReady: 15,
    status: "Funding Soon",
    usdBalance: 540000,
    sdgBalance: 21000000,
    liquidityLimit: 28000000,
    services: ["Cash Pickup", "Remittance"],
    lastUpdated: "08:40",
    active: true,
  },
  {
    id: 12,
    code: "SN-012",
    name: "Sennar Branch",
    manager: "Rania Adam",
    city: "Sennar",
    state: "Sennar",
    phone: "+249 912 876 543",
    email: "sennar@remitconnect.sd",
    availableAccounts: 2.73,
    filesReady: 10,
    status: "Ready",
    usdBalance: 1120000,
    sdgBalance: 41000000,
    liquidityLimit: 50000000,
    services: ["Cash Pickup", "Account Funding", "Compliance"],
    lastUpdated: "08:35",
    active: true,
  },
];

export const branches: Branch[] = branchSeeds.map((branch) => createBranch(branch));

export function filterBranches(
  query: string,
  status: BranchStatus | "All"
): Branch[] {
  const normalizedQuery = query.trim().toLowerCase();

  return branches.filter((branch) => {
    const matchesStatus = status === "All" || branch.status === status;
    const matchesQuery =
      normalizedQuery.length === 0 ||
      [branch.code, branch.name, branch.manager, branch.city, branch.state]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery);

    return matchesStatus && matchesQuery;
  });
}

export interface DashboardLiquiditySummary {
  totalAvailableLiquidity: number;
  totalUsdBalance: number;
  totalFilesReady: number;
  branchesBelowThreshold: number;
  criticalBranches: number;
}

export function getDashboardLiquiditySummary(
  branchData: Branch[] = branches
): DashboardLiquiditySummary {
  return {
    totalAvailableLiquidity: branchData.reduce(
      (sum, branch) => sum + branch.liquidity.availableLiquidity,
      0
    ),
    totalUsdBalance: branchData.reduce(
      (sum, branch) => sum + branch.liquidity.usdBalance,
      0
    ),
    totalFilesReady: branchData.reduce((sum, branch) => sum + branch.filesReady, 0),
    branchesBelowThreshold: branchData.filter(
      (branch) => branch.liquidity.isBelowThreshold
    ).length,
    criticalBranches: branchData.filter(
      (branch) => branch.liquidity.health === "Critical"
    ).length,
  };
}

export function getBranchById(branchId: number): Branch | undefined {
  return branches.find((branch) => branch.id === branchId);
}