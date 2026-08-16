import type { Branch } from "../types/branch";

/**
 * Minimal branch registry (Liquidity Management, closes part of REPORTING_ARCHITECTURE.md
 * Decision D-7: "no branch registry service exists in REOS - types/branch.ts defines
 * Branch; nothing lists branches").
 *
 * Deliberately not a branch administration module - four branches, matching the ids
 * BranchAssignmentPanel.tsx already uses for Assignment (PORT_SUDAN, KASSALA, DONGOLA,
 * KOSTI), not a new invented set. See LIQUIDITY_MANAGEMENT.md Section 3/14.
 */
const branches: readonly Branch[] = [
  { id: "PORT_SUDAN", code: "PS", name: "Port Sudan Branch", city: "Port Sudan", state: "Red Sea", status: "ACTIVE" },
  { id: "KASSALA", code: "KS", name: "Kassala Branch", city: "Kassala", state: "Kassala", status: "ACTIVE" },
  { id: "DONGOLA", code: "DN", name: "Dongola Branch", city: "Dongola", state: "Northern", status: "ACTIVE" },
  { id: "KOSTI", code: "KO", name: "Kosti Branch", city: "Kosti", state: "White Nile", status: "ACTIVE" },
];

export function getAllBranches(): readonly Branch[] {
  return branches.map((branch) => ({ ...branch }));
}

export function getBranchById(branchId: string): Branch | null {
  const branch = branches.find((candidate) => candidate.id === branchId);
  return branch ? { ...branch } : null;
}
