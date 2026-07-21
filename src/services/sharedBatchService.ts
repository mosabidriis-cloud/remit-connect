import { branches } from "./branchService";
import type {
  SharedBatch,
  SharedBatchAssignmentStatus,
  SharedBatchProgressSummary,
} from "../types/SharedBatch";

const CREDIT_TO_ACCOUNT_BRANCH_ID = 1;

const sharedBatches: SharedBatch[] = [
  {
    id: 1,
    batchCode: "DR-2026-0718-001",
    fileName: "DirectRemit_PortSudan_2026-07-18.xlsx",
    receivedAt: "2026-07-18 08:10",
    source: "Direct Remit Excel",
    transactionCount: 4,
    totalAmount: 18_750_000,
    currency: "SDG",
    assignmentStatus: "Assigned",
    assignedBranchId: 1,
    assignedBranchName: "Port Sudan Branch",
    assignedAt: "2026-07-18 08:35",
    assignedBy: "Operations Manager",
    notes: "High-value Port Sudan customer payout file.",
    transactions: [
      {
        id: 101,
        reference: "DR-PS-0001",
        senderName: "Abdelrahman Musa",
        receiverName: "Hassan Omer",
        receiverPhone: "+249 912 100 001",
        receiverBank: "Bank of Khartoum",
        receiverAccountNumber: "018001000145",
        destinationCity: "Port Sudan",
        amount: 5_000_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 102,
        reference: "DR-PS-0002",
        senderName: "Mariam Osman",
        receiverName: "Sara Khalid",
        receiverPhone: "+249 912 100 002",
        receiverBank: "Faisal Islamic Bank",
        receiverAccountNumber: "018001000239",
        destinationCity: "Port Sudan",
        amount: 4_250_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 103,
        reference: "DR-PS-0003",
        senderName: "Yousif Ibrahim",
        receiverName: "Amin Hassan",
        receiverPhone: "+249 912 100 003",
        receiverBank: "Omdurman National Bank",
        receiverAccountNumber: "018001000318",
        destinationCity: "Port Sudan",
        amount: 6_000_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 104,
        reference: "DR-PS-0004",
        senderName: "Nadia Ali",
        receiverName: "Rania Salim",
        receiverPhone: "+249 912 100 004",
        receiverBank: "Bank of Khartoum",
        receiverAccountNumber: "018001000427",
        destinationCity: "Port Sudan",
        amount: 3_500_000,
        currency: "SDG",
        status: "Pending",
      },
    ],
  },
  {
    id: 2,
    batchCode: "DR-2026-0718-002",
    fileName: "DirectRemit_Dongola_2026-07-18.xlsx",
    receivedAt: "2026-07-18 09:25",
    source: "Direct Remit Excel",
    transactionCount: 3,
    totalAmount: 9_400_000,
    currency: "SDG",
    assignmentStatus: "Unassigned",
    notes: "Northern state transactions awaiting branch assignment.",
    transactions: [
      {
        id: 201,
        reference: "DR-DN-0001",
        senderName: "Khalid Adam",
        receiverName: "Mohamed Salih",
        receiverPhone: "+249 918 200 001",
        receiverBank: "Faisal Islamic Bank",
        receiverAccountNumber: "022002000111",
        destinationCity: "Dongola",
        amount: 2_900_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 202,
        reference: "DR-DN-0002",
        senderName: "Huda Bashir",
        receiverName: "Amna Yassin",
        receiverPhone: "+249 918 200 002",
        receiverBank: "Bank of Khartoum",
        receiverAccountNumber: "022002000284",
        destinationCity: "Dongola",
        amount: 3_800_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 203,
        reference: "DR-DN-0003",
        senderName: "Osman Idris",
        receiverName: "Fatima Omer",
        receiverPhone: "+249 918 200 003",
        receiverBank: "Omdurman National Bank",
        receiverAccountNumber: "022002000392",
        destinationCity: "Dongola",
        amount: 2_700_000,
        currency: "SDG",
        status: "Pending",
      },
    ],
  },
  {
    id: 3,
    batchCode: "DR-2026-0718-003",
    fileName: "DirectRemit_Kassala_2026-07-18.xlsx",
    receivedAt: "2026-07-18 10:05",
    source: "Direct Remit Excel",
    transactionCount: 5,
    totalAmount: 12_300_000,
    currency: "SDG",
    assignmentStatus: "In Branch Review",
    assignedBranchId: 4,
    assignedBranchName: "Kassala Branch",
    assignedAt: "2026-07-18 10:20",
    assignedBy: "Operations Manager",
    notes: "Kassala branch is reviewing receiver contact details.",
    transactions: [
      {
        id: 301,
        reference: "DR-KS-0001",
        senderName: "Eiman Ahmed",
        receiverName: "Mona Yousif",
        receiverPhone: "+249 915 300 001",
        receiverBank: "Bank of Khartoum",
        receiverAccountNumber: "031003000118",
        destinationCity: "Kassala",
        amount: 1_900_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 302,
        reference: "DR-KS-0002",
        senderName: "Bakri Noor",
        receiverName: "Sami Ali",
        receiverPhone: "+249 915 300 002",
        receiverBank: "Faisal Islamic Bank",
        receiverAccountNumber: "031003000276",
        destinationCity: "Kassala",
        amount: 2_600_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 303,
        reference: "DR-KS-0003",
        senderName: "Salma Farah",
        receiverName: "Noor Adam",
        receiverPhone: "+249 915 300 003",
        receiverBank: "Omdurman National Bank",
        receiverAccountNumber: "031003000363",
        destinationCity: "Kassala",
        amount: 3_200_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 304,
        reference: "DR-KS-0004",
        senderName: "Yasir Mahmoud",
        receiverName: "Lina Hassan",
        receiverPhone: "+249 915 300 004",
        receiverBank: "Bank of Khartoum",
        receiverAccountNumber: "031003000401",
        destinationCity: "Kassala",
        amount: 2_100_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 305,
        reference: "DR-KS-0005",
        senderName: "Sara Osman",
        receiverName: "Hisham Idris",
        receiverPhone: "+249 915 300 005",
        receiverBank: "Faisal Islamic Bank",
        receiverAccountNumber: "031003000512",
        destinationCity: "Kassala",
        amount: 2_500_000,
        currency: "SDG",
        status: "Pending",
      },
    ],
  },
  {
    id: 4,
    batchCode: "DR-2026-0717-001",
    fileName: "DirectRemit_Kosti_2026-07-17.xlsx",
    receivedAt: "2026-07-17 16:40",
    source: "Direct Remit Excel",
    transactionCount: 2,
    totalAmount: 4_800_000,
    currency: "SDG",
    assignmentStatus: "Completed",
    assignedBranchId: 10,
    assignedBranchName: "Kosti Branch",
    assignedAt: "2026-07-17 17:00",
    assignedBy: "Operations Manager",
    notes: "Batch closed by branch operations.",
    transactions: [
      {
        id: 401,
        reference: "DR-KO-0001",
        senderName: "Abu Baker Ali",
        receiverName: "Tariq Omer",
        receiverPhone: "+249 911 400 001",
        receiverBank: "Omdurman National Bank",
        receiverAccountNumber: "047004000144",
        destinationCity: "Kosti",
        amount: 2_200_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 402,
        reference: "DR-KO-0002",
        senderName: "Rania Ahmed",
        receiverName: "Hiba Khalid",
        receiverPhone: "+249 911 400 002",
        receiverBank: "Bank of Khartoum",
        receiverAccountNumber: "047004000238",
        destinationCity: "Kosti",
        amount: 2_600_000,
        currency: "SDG",
        status: "Pending",
      },
    ],
  },
  {
    id: 5,
    batchCode: "DR-2026-0718-004",
    fileName: "DirectRemit_PortSudan_Credit_2026-07-18.xlsx",
    receivedAt: "2026-07-18 11:15",
    source: "Direct Remit Excel",
    transactionCount: 3,
    totalAmount: 7_650_000,
    currency: "SDG",
    assignmentStatus: "In Branch Review",
    assignedBranchId: 1,
    assignedBranchName: "Port Sudan Branch",
    assignedAt: "2026-07-18 11:35",
    assignedBy: "Operations Manager",
    notes: "Port Sudan account credit review batch.",
    transactions: [
      {
        id: 501,
        reference: "DR-PS-0101",
        senderName: "Hiba Abdelaziz",
        receiverName: "Mahmoud Saleh",
        receiverPhone: "+249 912 500 001",
        receiverBank: "Faisal Islamic Bank",
        receiverAccountNumber: "018001001031",
        destinationCity: "Port Sudan",
        amount: 2_450_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 502,
        reference: "DR-PS-0102",
        senderName: "Samir Osman",
        receiverName: "Maysaa Noor",
        receiverPhone: "+249 912 500 002",
        receiverBank: "Bank of Khartoum",
        receiverAccountNumber: "018001001147",
        destinationCity: "Port Sudan",
        amount: 1_900_000,
        currency: "SDG",
        status: "Pending",
      },
      {
        id: 503,
        reference: "DR-PS-0103",
        senderName: "Iman Khalifa",
        receiverName: "Tamer Yassin",
        receiverPhone: "+249 912 500 003",
        receiverBank: "Omdurman National Bank",
        receiverAccountNumber: "018001001253",
        destinationCity: "Port Sudan",
        amount: 3_300_000,
        currency: "SDG",
        status: "Pending",
      },
    ],
  },
];

function getAssignedStatuses(): SharedBatchAssignmentStatus[] {
  return ["Assigned", "In Branch Review", "Completed"];
}

export function getSharedBatches(): SharedBatch[] {
  return sharedBatches;
}

export function getSharedBatchById(batchId: number): SharedBatch | undefined {
  return sharedBatches.find((batch) => batch.id === batchId);
}

export function getCreditToAccountOfficerBranch() {
  return branches.find((branch) => branch.id === CREDIT_TO_ACCOUNT_BRANCH_ID);
}

export function getCreditToAccountAssignedBatches(
  branchId: number = CREDIT_TO_ACCOUNT_BRANCH_ID
): SharedBatch[] {
  return sharedBatches.filter(
    (batch) =>
      batch.assignedBranchId === branchId &&
      batch.assignmentStatus !== "Unassigned"
  );
}

export function getCreditToAccountAssignedBatchById(
  batchId: number,
  branchId: number = CREDIT_TO_ACCOUNT_BRANCH_ID
): SharedBatch | undefined {
  return getCreditToAccountAssignedBatches(branchId).find(
    (batch) => batch.id === batchId
  );
}

export function getSharedBatchProgressText(batch: SharedBatch): string {
  const closedTransactions = batch.transactions.filter(
    (transaction) => transaction.status === "Completed"
  ).length;

  return `${closedTransactions}/${batch.transactionCount}`;
}

export function getSharedBatchProgressSummary(): SharedBatchProgressSummary {
  return {
    totalBatches: sharedBatches.length,
    unassignedBatches: sharedBatches.filter(
      (batch) => batch.assignmentStatus === "Unassigned"
    ).length,
    assignedBatches: sharedBatches.filter((batch) =>
      getAssignedStatuses().includes(batch.assignmentStatus)
    ).length,
    inBranchReviewBatches: sharedBatches.filter(
      (batch) => batch.assignmentStatus === "In Branch Review"
    ).length,
    completedBatches: sharedBatches.filter(
      (batch) => batch.assignmentStatus === "Completed"
    ).length,
    totalTransactions: sharedBatches.reduce(
      (sum, batch) => sum + batch.transactionCount,
      0
    ),
  };
}

export function assignSharedBatchToBranch(
  batchId: number,
  branchId: number
): SharedBatch | undefined {
  const batch = getSharedBatchById(batchId);
  const branch = branches.find((item) => item.id === branchId);

  if (!batch || !branch || batch.assignmentStatus === "Completed") {
    return undefined;
  }

  batch.assignedBranchId = branch.id;
  batch.assignedBranchName = branch.name;
  batch.assignedAt = new Date().toLocaleString("en-GB");
  batch.assignedBy = "Operations Manager";
  batch.assignmentStatus = "Assigned";
  batch.transactions = batch.transactions.map((transaction) => ({
    ...transaction,
    status:
      transaction.status === "Pending"
        ? "Pending"
        : transaction.status,
  }));

  return batch;
}
