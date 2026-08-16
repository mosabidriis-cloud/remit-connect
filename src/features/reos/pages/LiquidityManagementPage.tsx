import { useState } from "react";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { FundingRecorder } from "../components/FundingRecorder";
import { PayoutAccountManager } from "../components/PayoutAccountManager";
import { useReosSession } from "../layout/reosAuthContext";
import { getAllBranches } from "../services/branchRegistryService";
import { colors, radius, spacing, typography } from "../theme";

export function LiquidityManagementPage() {
  const { session } = useReosSession();
  const branches = getAllBranches();
  const [selectedBranchId, setSelectedBranchId] = useState(branches[0]?.id ?? "");
  // Bumped by either child after a write and passed down as a prop, so both re-fetch and
  // stay in sync - see PayoutAccountManager's onChange doc comment. Passed explicitly
  // (not just used to force a parent re-render) because each child's data fetch is now
  // an effect keyed on this value, not a synchronous read during render.
  const [refreshSignal, setRefreshSignal] = useState(0);
  const handleChange = () => setRefreshSignal((value) => value + 1);

  return (
    <PageContainer>
      <PageHeader
        description="Manage branch payout accounts and record funding received. Funding happens outside REOS - this only records it."
        title="Liquidity Management"
      />

      <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.md, padding: spacing.lg }}>
        <label style={{ color: colors.text, display: "grid", fontSize: typography.small, fontWeight: 500, gap: spacing.xs, maxWidth: 320 }}>
          Branch
          <select
            onChange={(event) => setSelectedBranchId(event.target.value)}
            style={{ border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: `${spacing.sm}px ${spacing.md}px` }}
            value={selectedBranchId}
          >
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedBranchId && session ? (
        <>
          <PayoutAccountManager actorUserId={session.userId} branchId={selectedBranchId} onChange={handleChange} refreshSignal={refreshSignal} />
          <FundingRecorder actorUserId={session.userId} branchId={selectedBranchId} onChange={handleChange} refreshSignal={refreshSignal} />
        </>
      ) : null}
    </PageContainer>
  );
}
