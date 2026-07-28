export type ProofOfPaymentFileStatus =
  | "TEMPORARY"
  | "DOWNLOADED"
  | "EXPIRED";

export interface ProofOfPayment {
  id: string;
  transactionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  previewUrl: string;
  uploadedByUserId: string;
  uploadedAt: string;
  expiresAt: string;
  status: ProofOfPaymentFileStatus;
}

export interface ProofOfPaymentMetadata {
  id: string;
  transactionId: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedByUserId: string;
  uploadedAt: string;
  downloadedAt: string | null;
}
