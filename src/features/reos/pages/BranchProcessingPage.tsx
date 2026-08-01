import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { BranchProcessingQueue } from "../components/BranchProcessingQueue";
import { PageContainer } from "../components/common/PageContainer";
import { PageHeader } from "../components/common/PageHeader";
import type { Assignment } from "../types/assignment";

const sampleAssignments: Assignment[] = [
  {
    id: "assignment-1",
    sharedBatchId: "batch-1",
    batchReference: "BATCH-001",
    assignedBranchId: "PORT_SUDAN",
    assignedBranchName: "Port Sudan Branch",
    assignedBy: "officer-1",
    assignedAt: "2026-08-01T00:00:00.000Z",
    readyTransactionCount: 2,
    manualReviewCount: 0,
    invalidCount: 0,
    assignedTransactions: [
      {
        id: "txn-1",
        directRemitReference: "REF-001",
        transactionDate: "2026-08-01",
        beneficiaryName: "Amina Hassan",
        currency: "SDG",
        amount: 1250,
        destinationCountry: "Sudan",
        bankName: "Bank of Khartoum",
        accountNumber: "1001",
        sharedBatchId: "batch-1",
        assignedBranchId: "PORT_SUDAN",
        processingStatusId: "READY_FOR_ASSIGNMENT",
        returnReasonId: null,
        receiptUploaded: false,
        manualReviewRequired: false,
        manualReviewReason: null,
      },
      {
        id: "txn-2",
        directRemitReference: "REF-002",
        transactionDate: "2026-08-01",
        beneficiaryName: "Musa Ibrahim",
        currency: "SDG",
        amount: 980,
        destinationCountry: "Sudan",
        bankName: "Bank of Khartoum",
        accountNumber: "1002",
        sharedBatchId: "batch-1",
        assignedBranchId: "PORT_SUDAN",
        processingStatusId: "READY_FOR_ASSIGNMENT",
        returnReasonId: null,
        receiptUploaded: false,
        manualReviewRequired: false,
        manualReviewReason: null,
      },
    ],
    manualReviewTransactions: [],
    invalidTransactions: [],
    status: "ASSIGNED",
  },
];

export function BranchProcessingPage() {
  const { branchId = "PORT_SUDAN" } = useParams();

  const branchAssignments = useMemo(
    () => sampleAssignments.filter((assignment) => assignment.assignedBranchId === branchId),
    [branchId],
  );

  const branchName = branchAssignments[0]?.assignedBranchName ?? branchId;

  return (
    <PageContainer>
      <PageHeader
        description="Branch processing queue for the selected branch."
        title="Branch Processing"
      />
      <BranchProcessingQueue assignments={branchAssignments} branchId={branchId} branchName={branchName} />
    </PageContainer>
  );
}
