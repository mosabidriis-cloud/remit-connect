import { supabase } from "../../../lib/supabase";
import type { ProofOfPayment, ProofOfPaymentMetadata } from "../types/proofOfPayment";

/**
 * Operational Persistence Milestone 2 (OPERATIONAL_PERSISTENCE.md, DEC-020). Proof bytes
 * live in the private `proof-of-payment` Supabase Storage bucket; `previewUrl` is always a
 * freshly generated signed URL, never a stored value - replacing the previous
 * `URL.createObjectURL(file)` blob URL, which was only ever valid within the browser tab
 * that created it and could not survive reload or a second session.
 */

const proofLifetimeMinutes = 90;
const proofBucket = "proof-of-payment";
const signedUrlLifetimeSeconds = 3600;

/**
 * Client-side mirror of the `proof-of-payment` Storage bucket's own `file_size_limit`
 * (set directly on the bucket, so this cap is enforced twice - once here for a fast,
 * friendly failure before any network call, once server-side by Storage itself so a
 * client that skips this check entirely still can't exceed it).
 */
export const MAX_PROOF_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export async function uploadProofOfPayment(file: File, transactionId: string, uploadedByUserId: string): Promise<ProofOfPayment> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Proof-of-payment uploads must be image files.");
  }

  if (file.size > MAX_PROOF_FILE_SIZE_BYTES) {
    throw new Error(`Proof-of-payment files must be ${MAX_PROOF_FILE_SIZE_BYTES / (1024 * 1024)}MB or smaller.`);
  }

  const id = crypto.randomUUID();
  const uploadedAt = new Date();
  const expiresAt = new Date(uploadedAt.getTime() + proofLifetimeMinutes * 60 * 1000);
  const storagePath = `${transactionId}/${id}-${sanitizeFileName(file.name)}`;

  const { error: uploadError } = await supabase.storage.from(proofBucket).upload(storagePath, file, {
    contentType: file.type,
  });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const previewUrl = await createSignedProofUrl(storagePath);

  return {
    id,
    transactionId,
    fileName: file.name,
    fileType: file.type,
    fileSize: file.size,
    storagePath,
    previewUrl,
    uploadedByUserId,
    uploadedAt: uploadedAt.toISOString(),
    expiresAt: expiresAt.toISOString(),
    status: "TEMPORARY",
  };
}

export async function createSignedProofUrl(storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from(proofBucket).createSignedUrl(storagePath, signedUrlLifetimeSeconds);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to generate a proof preview URL.");
  }

  return data.signedUrl;
}

/** Batches one Storage call for every proof, rather than one signed-URL request per proof. */
export async function createSignedProofUrls(storagePaths: readonly string[]): Promise<Map<string, string>> {
  if (storagePaths.length === 0) {
    return new Map();
  }

  const { data, error } = await supabase.storage.from(proofBucket).createSignedUrls([...storagePaths], signedUrlLifetimeSeconds);

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to generate proof preview URLs.");
  }

  const urlsByPath = new Map<string, string>();

  data.forEach((entry) => {
    if (entry.signedUrl && entry.path) {
      urlsByPath.set(entry.path, entry.signedUrl);
    }
  });

  return urlsByPath;
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

function sanitizeFileName(value: string): string {
  return value.replace(/[^a-zA-Z0-9.\-_]+/g, "-");
}
