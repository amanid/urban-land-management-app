import { Navigate, Route, Routes } from "react-router-dom";
import { useEffect } from "react";
import Layout from "@/components/Layout";
import Guard from "@/components/Guard";
import LoginPage from "@/pages/LoginPage";
import DashboardPage from "@/pages/DashboardPage";
import LotsPage from "@/pages/LotsPage";
import LotDetailPage from "@/pages/LotDetailPage";
import ClientsPage from "@/pages/ClientsPage";
import ClientDetailPage from "@/pages/ClientDetailPage";
import SalesPage from "@/pages/SalesPage";
import SaleDetailPage from "@/pages/SaleDetailPage";
import PaymentsPage from "@/pages/PaymentsPage";
import AcquisitionsPage from "@/pages/AcquisitionsPage";
import UsersPage from "@/pages/UsersPage";
import AuditPage from "@/pages/AuditPage";
import AdvancedAnalyticsPage from "@/pages/AdvancedAnalyticsPage";
import UserPerformancePage from "@/pages/UserPerformancePage";
import ProfilePage from "@/pages/ProfilePage";
import MaintenancePage from "@/pages/MaintenancePage";
import GuidePage from "@/pages/GuidePage";
import { useAuthStore } from "@/store/auth";

function PrivateRoute({ children }: { children: JSX.Element }) {
  const token = useAuthStore((s) => s.accessToken);
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  const user = useAuthStore((s) => s.user);
  useEffect(() => {
    document.title = user
      ? `Urban Land · ${user.full_name || user.email}`
      : "Urban Land · L'Excellence en Gestion Foncière";
  }, [user]);

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={<PrivateRoute><Layout /></PrivateRoute>}
      >
        <Route index element={<DashboardPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="guide" element={<GuidePage />} />

        <Route path="lots" element={<Guard capability="view_lots"><LotsPage /></Guard>} />
        <Route path="lots/:id" element={<Guard capability="view_lots"><LotDetailPage /></Guard>} />

        <Route path="clients" element={<Guard capability="view_clients"><ClientsPage /></Guard>} />
        <Route path="clients/:id" element={<Guard capability="view_clients"><ClientDetailPage /></Guard>} />

        <Route path="sales" element={<Guard capability="view_sales"><SalesPage /></Guard>} />
        <Route path="sales/:id" element={<Guard capability="view_sales"><SaleDetailPage /></Guard>} />

        <Route path="payments" element={<Guard capability="view_payments"><PaymentsPage /></Guard>} />

        <Route path="acquisitions" element={<Guard capability="view_acquisitions"><AcquisitionsPage /></Guard>} />

        <Route path="analytics" element={<Guard capability="view_advanced_analytics"><AdvancedAnalyticsPage /></Guard>} />
        <Route path="performance" element={<Guard capability="view_user_performance"><UserPerformancePage /></Guard>} />
        <Route path="users" element={<Guard capability="view_users"><UsersPage /></Guard>} />
        <Route path="audit" element={<Guard capability="view_audit_log"><AuditPage /></Guard>} />
        <Route path="maintenance" element={<Guard capability="wipe_test_data"><MaintenancePage /></Guard>} />
      </Route>
    </Routes>
  );
}
