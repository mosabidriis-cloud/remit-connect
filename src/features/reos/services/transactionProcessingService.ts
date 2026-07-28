import type { ProofOfPayment } from "../types/proofOfPayment";
import type { ReturnReason } from "../types/returnReason";
import type {
  CreditToAccountTransaction,
  ReturnTransactionInput,
  TransactionProcessingAudit,
} from "../types/transactionProcessing";

export const defaultReturnReasons: ReturnReason[] = [
  {
    id: "return-reason-incomplete",
    code: "INCOMPLETE",
    name: "Incomplete Documentation",
    description: "Proof-of-payment or supporting documents are incomplete.",
    isActive: true,
  },
  {
    id: "return-reason-incorrect",
    code: "INCORRECT",
    name: "Incorrect Beneficiary Details",
    description: "The beneficiary or account details do not match the uploaded record.",
    isActive: true,
  },
  {
    id: "return-reason-duplicate",
    code: "DUPLICATE",
    name: "Duplicate Transaction",
    description: "The transaction appears to be duplicated.",
    isActive: true,
  },
];

export function getActiveReturnReasons(): ReturnReason[] {
  return defaultReturnReasons.filter((reason) => reason.isActive);
}

export function getNextTransactionIndex(currentIndex: number, totalTransactions: number): number | null {
  if (totalTransactions <= 0) {
    return null;
  }

  const nextIndex = currentIndex + 1;
  return nextIndex < totalTransactions ? nextIndex : null;
}

export function addProofToTransaction(
  transaction: CreditToAccountTransaction,
  proof: ProofOfPayment,
  performedByUserId: string,
): { transaction: CreditToAccountTransaction; audit: TransactionProcessingAudit } {
  return {
    transaction: {
      ...transaction,
      proofs: [...transaction.proofs, proof],
    },
    audit: createAudit(transaction.id, "PROOF_UPLOADED", performedByUserId, `Uploaded proof ${proof.fileName}.`),
  };
}

export function completeTransaction(
  transaction: CreditToAccountTransaction,
  completedByUserId: string,
): { transaction: CreditToAccountTransaction; audit: TransactionProcessingAudit } {
  if (transaction.proofs.length === 0) {
    throw new Error("At least one proof-of-payment screenshot is required before completion.");
  }

  const completedAt = new Date().toISOString();

  return {
    transaction: {
      ...transaction,
      status: "COMPLETED",
      completedByUserId,
      completedAt,
    },
    audit: createAudit(transaction.id, "TRANSACTION_COMPLETED", completedByUserId, "Completed Credit-to-Account transaction."),
  };
}

export function returnTransaction(input: ReturnTransactionInput): {
  transaction: CreditToAccountTransaction;
  audit: TransactionProcessingAudit;
} {
  if (!input.returnReason.isActive) {
    throw new Error("An active predefined Return Reason is required.");
  }

  const returnedAt = new Date().toISOString();

  return {
    transaction: {
      ...input.transaction,
      status: "RETURNED",
      returnedByUserId: input.returnedByUserId,
      returnedAt,
      returnReason: input.returnReason,
      returnComment: input.comment || null,
    },
    audit: createAudit(
      input.transaction.id,
      "TRANSACTION_RETURNED",
      input.returnedByUserId,
      `Returned transaction using reason ${input.returnReason.code}.`,
    ),
  };
}

function createAudit(
  transactionId: string,
  action: TransactionProcessingAudit["action"],
  performedByUserId: string,
  details: string,
): TransactionProcessingAudit {
  return {
    id: crypto.randomUUID(),
    transactionId,
    action,
    performedByUserId,
    performedAt: new Date().toISOString(),
    details,
  };
}
