import type { ProofOfPayment, ProofOfPaymentMetadata } from "../types/proofOfPayment";

const proofLifetimeMinutes = 90;

export function createProofOfPayment(file: File, transactionId: string, uploadedByUserId: string): ProofOfPayment {
  if (!file.type.startsWith("image/")) {
    throw new Error("Proof-of-payment uploads must be image files.");
  }

  const uploadedAt = new Date();
  const expiresAt = new Date(uploadedAt.getTime() + proofLifetimeMinutes * 60 * 1000);

  return {
    id: crypto.randomUUID(),
    transactionId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    previewUrl: URL.createObjectURL(file),
    uploadedByUserId,
    uploadedAt: uploadedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "TEMPORARY",
  };
}

export function createProofMetadata(proof: ProofOfPayment): ProofOfPaymentMetadata {
  return {
    id: proof.id,
    transactionId: proof.transactionId,
    fileName: proof.fileName,
    fileType: proof.fileType,
    fileSize: proof.fileSize,
    uploadedByUserId: proof.uploadedByUserId,
    uploadedAt: proof.uploadedAt,
    downloadedAt: null,
  };
}

export function markProofDownloaded(proof: ProofOfPayment): ProofOfPayment {
  return {
    ...proof,
    status: "DOWNLOADED",
  };
}
