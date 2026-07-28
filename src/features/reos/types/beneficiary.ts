export interface Beneficiary {
  id: string;
  directRemitReference: string;
  transactionDate: string;
  beneficiaryName: string;
  currency: string;
  amount: number;
  destinationCountry: string;
  bankName: string;
  accountNumber: string;
  sharedBatchId: string;
  assignedBranchId: string | null;
  processingStatusId: string;
  returnReasonId: string | null;
  receiptUploaded: boolean;
  manualReviewRequired: boolean;
  manualReviewReason: string | null;
}
