import { useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
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
  const activeReturnReasons = returnReasons.filter((reason) => reason.isActive);
  const canComplete = Boolean(transaction && transaction.status === "PENDING" && transaction.proofs.length > 0);
  const canReturn = Boolean(transaction && transaction.status === "PENDING" && activeReturnReasons.length > 0);

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
      <section className="mx-auto grid w-full max-w-7xl gap-6">
        <header className="border-b border-slate-200 pb-4">
          <h1 className="text-2xl font-semibold text-slate-950">Transaction Processing</h1>
          <p className="mt-1 text-sm text-slate-600">Process the selected assigned Credit-to-Account transaction.</p>
        </header>
        <div className="rounded border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No assigned transaction is selected.
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid w-full max-w-7xl gap-6">
      <header className="border-b border-slate-200 pb-4">
        <h1 className="text-2xl font-semibold text-slate-950">Transaction Processing</h1>
        <p className="mt-1 text-sm text-slate-600">Process the selected assigned Credit-to-Account transaction.</p>
      </header>
      <ProcessingProgress currentPosition={currentPosition} totalTransactions={totalTransactions} />
      <TransactionCard transaction={transaction} />
      <ProofUpload onUpload={handleProofUpload} />
      <ProofGallery proofs={transaction.proofs} />
      <div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 pt-4">
        <button
          className="rounded border border-red-300 px-4 py-2 text-sm font-medium text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canReturn}
          onClick={() => {
            if (activeReturnReasons.length === 0) {
              setMessage("At least one active return reason is required.");
            }
          }}
          type="button"
        >
          Return Transaction
        </button>
        <button
          className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!canComplete}
          onClick={handleComplete}
          type="button"
        >
          Complete Transaction
        </button>
      </div>
      <ReturnTransactionDialog returnReasons={returnReasons} onReturn={handleReturn} />
      {message ? <div className="rounded border border-slate-200 bg-white p-4 text-sm text-slate-700">{message}</div> : null}
      {audits.length > 0 ? (
        <div className="rounded border border-slate-200 bg-white p-4">
          <h2 className="text-base font-semibold text-slate-950">Audit</h2>
          <ul className="mt-2 grid gap-2">
            {audits.map((audit) => (
              <li className="text-sm text-slate-700" key={audit.id}>
                {audit.performedAt}: {audit.details}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
