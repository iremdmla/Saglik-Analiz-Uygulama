import { Box, LinearProgress, Stack } from "@mui/material";
import { LogoMark } from "./components/Logo";
import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import { AppProviders } from "./components/AppProviders";
import Layout from "./components/Layout";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminStats from "./pages/admin/AdminStats";
import AdminUsers from "./pages/admin/AdminUsers";
import Analysis from "./pages/Analysis";
import Assistant from "./pages/Assistant";
import Dashboard from "./pages/Dashboard";
import { LoginPage, RegisterPage } from "./pages/Auth";
import Measurements from "./pages/Measurements";
import NotFound from "./pages/NotFound";
import Profile from "./pages/Profile";
import Records from "./pages/Records";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";

function Protected({ children, admin }: { children: ReactNode; admin?: boolean }) {
  const { user, ready } = useAuth();
  if (!ready) {
    return (
      <Box minHeight="100vh" display="grid" sx={{ placeItems: "center" }}>
        <Stack alignItems="center" spacing={2} sx={{ animation: "fadeUp .4s ease" }}>
          <Box sx={{ animation: "pulse 1.4s ease-in-out infinite", "@keyframes pulse": { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.08)" } } }}>
            <LogoMark size={64} />
          </Box>
          <LinearProgress sx={{ width: 140 }} />
        </Stack>
      </Box>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (admin && user.role !== "ADMIN") return <Navigate to="/" replace />;
  return <>{children}</>;
}

function GuestOnly({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  if (ready && user) return <Navigate to={user.role === "ADMIN" ? "/admin" : "/"} replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <AppProviders>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<GuestOnly><LoginPage /></GuestOnly>} />
            <Route path="/register" element={<GuestOnly><RegisterPage /></GuestOnly>} />
            <Route element={<Protected><Layout /></Protected>}>
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="records" element={<Records />} />
              <Route path="measurements" element={<Measurements />} />
              <Route path="reports" element={<Reports />} />
              <Route path="analysis" element={<Analysis />} />
              <Route path="assistant" element={<Assistant />} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin" element={<Protected admin><AdminDashboard /></Protected>} />
              <Route path="admin/users" element={<Protected admin><AdminUsers /></Protected>} />
              <Route path="admin/logs" element={<Protected admin><AdminLogs /></Protected>} />
              <Route path="admin/stats" element={<Protected admin><AdminStats /></Protected>} />
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </AppProviders>
  );
}
