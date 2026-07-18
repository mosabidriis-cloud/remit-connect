import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import Dashboard from "../pages/controller/Dashboard";
import BranchListPage from "../pages/branches/BranchListPage";
import BranchDetailsPage from "../pages/branches/BranchDetailsPage";

function DirectRemitDashboard() {
  return <h1>Direct Remit Operations</h1>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route path="/controller/dashboard" element={<Dashboard />} />

      <Route path="/branches" element={<BranchListPage />} />
      <Route path="/branches/:branchId" element={<BranchDetailsPage />} />

      <Route path="/direct-remit" element={<DirectRemitDashboard />} />

      <Route path="*" element={<h1>404 - Page Not Found</h1>} />
    </Routes>
  );
}