import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/common/EmptyState";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import { colors, radius, spacing, typography } from "../theme";
import { ProcessingProgress } from "../components/ProcessingProgress";
import { ProofGallery } from "../components/ProofGallery";
import { ProofUpload } from "../components/ProofUpload";
import { ReturnTransactionDialog } from "../components/ReturnTransactionDialog";
import { TransactionCard } from "../components/TransactionCard";
import { createProofOfPayment } from "../services/proofOfPaymentService";
import {
  addProofToTransaction,
  completeTransaction,
  getActiveReturnReasons,
  getNextTransactionIndex,
  returnTransaction,
} from "../services/transactionProcessingService";
import type { BranchProcessingBatch } from "../types/transactionProcessing";
import type { ReturnReason } from "../types/returnReason";
import type {
  CreditToAccountTransaction,
  TransactionProcessingAudit,
} from "../types/transactionProcessing";

type TransactionProcessingLocationState = {
  batch?: BranchProcessingBatch;
  transaction?: CreditToAccountTransaction;
  transactionIndex?: number;
  currentPosition?: number;
  totalTransactions?: number;
  returnReasons?: ReturnReason[];
  branchOfficerUserId?: string;
};

export function TransactionProcessingPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { branchId = "" } = useParams();
  const state = location.state as TransactionProcessingLocationState | null;
  const [transaction, setTransaction] = useState<CreditToAccountTransaction | null>(state?.transaction ?? null);
  const [audits, setAudits] = useState<TransactionProcessingAudit[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(state?.transactionIndex ?? 0);
  const batch = state?.batch ?? null;
  const currentPosition = state?.currentPosition ?? currentIndex + 1;
  const totalTransactions = state?.totalTransactions ?? 0;
  const branchOfficerUserId = state?.branchOfficerUserId ?? "BRANCH_OFFICER";
  const returnReasons = state?.returnReasons ?? getActiveReturnReasons();
  const canComplete = Boolean(transaction && transaction.status === "PENDING" && transaction.proofs.length > 0);

  const handleProofUpload = (files: File[]) => {
    if (!transaction) {
      return;
    }

    try {
      const nextState = files.reduce(
        (current, file) => {
          const proof = createProofOfPayment(file, current.transaction.id, branchOfficerUserId);
          const updatedState = addProofToTransaction(current.transaction, proof, branchOfficerUserId);
          return {
            transaction: updatedState.transaction,
            audits: [...current.audits, updatedState.audit],
          };
        },
        { transaction, audits: [] as TransactionProcessingAudit[] },
      );

      setTransaction(nextState.transaction);
      setAudits((currentAudits) => [...currentAudits, ...nextState.audits]);
      setMessage(null);
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to upload proof.");
    }
  };

  const handleComplete = () => {
    if (!transaction || !batch) {
      return;
    }

    if (transaction.status !== "PENDING") {
      setMessage("This transaction has already been processed.");
      return;
    }

    try {
      const result = completeTransaction(transaction, branchOfficerUserId);
      const nextIndex = getNextTransactionIndex(currentIndex, totalTransactions);
      const nextTransaction = nextIndex !== null && batch.transactions[nextIndex] ? batch.transactions[nextIndex] : null;

      setTransaction(result.transaction);
      setAudits((currentAudits) => [...currentAudits, result.audit]);
      setMessage("Transaction completed.");

      if (nextTransaction && nextIndex !== null) {
        setCurrentIndex(nextIndex);
        navigate(`/reos/branches/${branchId}/processing/${batch.id}/transactions/${nextTransaction.id}`, {
          state: {
            batch,
            transaction: nextTransaction,
            transactionIndex: nextIndex,
            currentPosition: nextIndex + 1,
            totalTransactions,
            returnReasons,
            branchOfficerUserId,
          },
        });
        return;
      }

      navigate(`/reos/branches/${branchId}/processing`, { state: { batches: [batch] } });
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to complete transaction.");
    }
  };

  const handleReturn = (returnReasonId: string, comment: string) => {
    if (!transaction || !batch) {
      return;
    }

    if (transaction.status !== "PENDING") {
      setMessage("This transaction has already been processed.");
      return;
    }

    const returnReason = returnReasons.find((reason) => reason.id === returnReasonId);

    if (!returnReason) {
      setMessage("A predefined Return Reason is required.");
      return;
    }

    try {
      const result = returnTransaction({
        transaction,
        returnReason,
        comment,
        returnedByUserId: branchOfficerUserId,
      });
      const nextIndex = getNextTransactionIndex(currentIndex, totalTransactions);
      const nextTransaction = nextIndex !== null && batch.transactions[nextIndex] ? batch.transactions[nextIndex] : null;

      setTransaction(result.transaction);
      setAudits((currentAudits) => [...currentAudits, result.audit]);
      setMessage("Transaction returned.");

      if (nextTransaction && nextIndex !== null) {
        setCurrentIndex(nextIndex);
        navigate(`/reos/branches/${branchId}/processing/${batch.id}/transactions/${nextTransaction.id}`, {
          state: {
            batch,
            transaction: nextTransaction,
            transactionIndex: nextIndex,
            currentPosition: nextIndex + 1,
            totalTransactions,
            returnReasons,
            branchOfficerUserId,
          },
        });
        return;
      }

      navigate(`/reos/branches/${branchId}/processing`, { state: { batches: [batch] } });
    } catch (caughtError) {
      setMessage(caughtError instanceof Error ? caughtError.message : "Unable to return transaction.");
    }
  };

  if (!transaction) {
    return (
      <PageContainer>
        <PageHeader
          description="Process the selected assigned Credit-to-Account transaction."
          title="Transaction Processing"
        />
        <EmptyState message="No assigned transaction is selected." />
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        description="Process the selected assigned Credit-to-Account transaction."
        title="Transaction Processing"
      />
      <ProcessingProgress currentPosition={currentPosition} totalTransactions={totalTransactions} />
      <TransactionCard transaction={transaction} />
      <ProofUpload onUpload={handleProofUpload} />
      <ProofGallery proofs={transaction.proofs} />
      <div style={{ borderTop: `1px solid ${colors.border}`, display: "flex", flexWrap: "wrap", gap: spacing.sm, justifyContent: "flex-end", paddingTop: spacing.lg }}>
        <button
          disabled={!canComplete}
          onClick={handleComplete}
          style={{
            backgroundColor: canComplete ? colors.primary : colors.slate200,
            border: "none",
            borderRadius: radius.sm,
            color: canComplete ? colors.surface : colors.muted,
            cursor: canComplete ? "pointer" : "not-allowed",
            fontSize: typography.small,
            fontWeight: 600,
            padding: `${spacing.sm}px ${spacing.lg}px`,
          }}
          type="button"
        >
          Complete Transaction
        </button>
      </div>
      <ReturnTransactionDialog returnReasons={returnReasons} onReturn={handleReturn} />
      {message ? (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, color: colors.text, fontSize: typography.small, padding: spacing.lg }}>
          {message}
        </div>
      ) : null}
      {audits.length > 0 ? (
        <div style={{ backgroundColor: colors.surface, border: `1px solid ${colors.border}`, borderRadius: radius.sm, padding: spacing.lg }}>
          <h2 style={{ color: colors.text, fontSize: typography.h3, fontWeight: 600 }}>Audit</h2>
          <ul style={{ display: "grid", gap: spacing.sm, marginTop: spacing.sm }}>
            {audits.map((audit) => (
              <li style={{ color: colors.muted, fontSize: typography.small }} key={audit.id}>
                {audit.performedAt}: {audit.details}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </PageContainer>
  );
}
