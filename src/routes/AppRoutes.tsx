import { Routes, Route, Navigate } from "react-router-dom";

import LoginPage from "../pages/auth/LoginPage";
import Dashboard from "../pages/controller/Dashboard";

function DirectRemitDashboard() {
  return <h1>Direct Remit Operations</h1>;
}

function BranchDashboard() {
  return <h1>Online Credit-to-Account Officer</h1>;
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      <Route path="/login" element={<LoginPage />} />

      <Route
        path="/controller/dashboard"
        element={<Dashboard />}
      />

      <Route
        path="/direct-remit"
        element={<DirectRemitDashboard />}
      />

      <Route
        path="/branch"
        element={<BranchDashboard />}
      />

      <Route
        path="*"
        element={<h1>404 - Page Not Found</h1>}
      />
    </Routes>
  );
}