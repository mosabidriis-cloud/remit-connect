export interface SharedBatch {
  id: string;
  reference: string;
  fileName: string;
  uploadDate: string;
  uploadedByUserId: string;
  totalBeneficiaries: number;
  assignedBeneficiaries: number;
  completedBeneficiaries: number;
  returnedBeneficiaries: number;
}
