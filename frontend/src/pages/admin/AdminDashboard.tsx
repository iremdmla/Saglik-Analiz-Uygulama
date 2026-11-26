import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FolderSharedRoundedIcon from "@mui/icons-material/FolderSharedRounded";
import GppMaybeRoundedIcon from "@mui/icons-material/GppMaybeRounded";
import HowToRegRoundedIcon from "@mui/icons-material/HowToRegRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import { alpha, Avatar, Box, Button, Chip, Stack, Typography, useTheme } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { AuditLog, User } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { ErrorState, fmtDate, fmtShort, HeroCard, initials, LoadingState, RingGauge, SectionCard, StatCard, useAsync } from "../../components/common";
import { axisProps, useChartTooltip } from "../../components/TrendChart";
import { gradients, palette } from "../../theme";
import { LogTable } from "./AdminLogs";

export interface AdminStatsT {
  total_users: number; active_users: number; admin_users: number; active_last_7d: number; total_records: number;
  total_measurements: number; total_documents: number; total_chat_messages: number; total_logs: number; failed_logins_7d: number;
  activity: { date: string; count: number; failed: number }[];
  actions: { action: string; count: number }[];
  record_categories: { category: string; count: number }[];
  recent_users: User[]; recent_logs: AuditLog[];
}

export function ActivityChart({ data, height = 280 }: { data: AdminStatsT["activity"]; height?: number }) {
  const theme = useTheme();
  const tip = useChartTooltip();
  const points = data.map((d) => ({ ...d, label: fmtShort(d.date) }));
  const ax = axisProps(theme.palette.text.secondary);
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={points} margin={{ top: 10, right: 10, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="actA" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette.teal} stopOpacity={0.4} /><stop offset="100%" stopColor={palette.teal} stopOpacity={0} /></linearGradient>
          <linearGradient id="actF" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={palette.coral} stopOpacity={0.3} /><stop offset="100%" stopColor={palette.coral} stopOpacity={0} /></linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="4 6" vertical={false} stroke={theme.palette.divider} />
        <XAxis dataKey="label" {...ax} minTickGap={10} />
        <YAxis allowDecimals={false} {...ax} />
        <Tooltip {...tip} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="count" name="Toplam işlem" stroke={palette.teal} strokeWidth={3} fill="url(#actA)" />
        <Area type="monotone" dataKey="failed" name="Başarısız" stroke={palette.coral} strokeWidth={2.5} fill="url(#actF)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useAsync(() => api<AdminStatsT>("/admin/stats"), []);
  if (loading) return <LoadingState rows={6} />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;
  const activeRatio = data.total_users ? Math.round((data.active_users / data.total_users) * 100) : 0;
  const weekOps = data.activity.slice(-7).reduce((a, d) => a + d.count, 0);

  return (
    <Stack spacing={2.5}>
      <HeroCard>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} p={{ xs: 2.5, md: 3.5 }} alignItems={{ md: "center" }}>
          <Box flex={1}>
            <Chip size="small" icon={<AdminPanelSettingsRoundedIcon />} label="Yönetici paneli" sx={{ bgcolor: alpha("#fff", 0.15), color: "#fff", mb: 1.5, "& .MuiChip-icon": { color: "#fff" } }} />
            <Typography variant="h3" sx={{ fontSize: { xs: 28, md: 36 } }}>Hoş geldiniz, {user?.full_name.split(" ")[0]}</Typography>
            <Typography sx={{ opacity: 0.85, mt: 1, maxWidth: 560 }}>
              Son 7 günde {weekOps} işlem kaydedildi{data.failed_logins_7d ? `, ${data.failed_logins_7d} başarısız giriş denemesi var` : ""}. Sağlık değerleri gizlilik gereği bu panelde gösterilmez.
            </Typography>
            <Stack direction="row" spacing={1} mt={2.5} flexWrap="wrap" useFlexGap>
              <Button variant="contained" onClick={() => navigate("/admin/users")} sx={{ background: "#fff", color: palette.navy, boxShadow: "none", "&:hover": { background: alpha("#fff", 0.9) } }}>Kullanıcıları yönet</Button>
              <Button variant="outlined" onClick={() => navigate("/admin/logs")} sx={{ color: "#fff", borderColor: alpha("#fff", 0.4), "&:hover": { borderColor: "#fff" } }}>Logları incele</Button>
            </Stack>
          </Box>
          <Stack direction="row" spacing={2.5} alignItems="center">
            <RingGauge value={activeRatio} size={150} thickness={14} colors={["#5EEAD4", "#C4B5FD"]} track={alpha("#fff", 0.15)}>
              <Typography variant="h4">%{activeRatio}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8 }}>aktif hesap</Typography>
            </RingGauge>
            <Stack spacing={1}>
              <Box><Typography variant="caption" sx={{ opacity: 0.7 }}>Aktif / toplam</Typography><Typography variant="h6">{data.active_users} / {data.total_users}</Typography></Box>
              <Box><Typography variant="caption" sx={{ opacity: 0.7 }}>Son 7 günde giriş</Typography><Typography variant="h6">{data.active_last_7d} kullanıcı</Typography></Box>
            </Stack>
          </Stack>
        </Stack>
      </HeroCard>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard solid label="Toplam kullanıcı" value={data.total_users} icon={<PeopleAltRoundedIcon />} color={palette.teal} hint={`${data.admin_users} yönetici`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard solid label="Aktif kullanıcı" value={data.active_users} icon={<HowToRegRoundedIcon />} color={palette.blue} hint={`%${activeRatio} aktif`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard solid label="Sağlık kaydı" value={data.total_records} icon={<FolderSharedRoundedIcon />} color={palette.violet} hint={`${data.total_measurements} ölçüm`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard solid label="Yüklenen rapor" value={data.total_documents} icon={<DescriptionRoundedIcon />} color={palette.amber} hint="PDF / görsel" /></Grid>
        <Grid size={{ xs: 12, lg: 2.4 }}><StatCard solid label="Başarısız giriş" value={data.failed_logins_7d} icon={<GppMaybeRoundedIcon />} color={palette.coral} hint="Son 7 gün" /></Grid>
      </Grid>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="Sistem aktivitesi" subtitle="Son 14 gün · toplam ve başarısız işlemler" icon={<ShowChartRoundedIcon />} color={palette.teal}>
            <ActivityChart data={data.activity} />
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Son kullanıcı kayıtları" icon={<PersonAddRoundedIcon />} color={palette.blue}
            action={<Button size="small" onClick={() => navigate("/admin/users")}>Tümü</Button>}>
            <Stack spacing={1}>
              {data.recent_users.map((u) => (
                <Stack key={u.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1, borderRadius: 3, "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, 0.04) } }}>
                  <Avatar sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 800, background: u.role === "ADMIN" ? gradients.violet : gradients.brand }}>{initials(u.full_name)}</Avatar>
                  <Box flex={1} minWidth={0}>
                    <Typography fontWeight={700} noWrap>{u.full_name}</Typography>
                    <Typography variant="caption" color="text.secondary">{u.role === "ADMIN" ? "Yönetici" : "Kullanıcı"} · {fmtDate(u.created_at)}</Typography>
                  </Box>
                  <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: u.is_active ? palette.green : palette.slate, boxShadow: `0 0 0 4px ${alpha(u.is_active ? palette.green : palette.slate, 0.18)}` }} />
                </Stack>
              ))}
            </Stack>
          </SectionCard>
        </Grid>
      </Grid>
      <SectionCard title="Son sistem aktiviteleri" icon={<ReceiptLongRoundedIcon />} color={palette.amber} pad={false} fill={false}
        action={<Button size="small" onClick={() => navigate("/admin/logs")}>Tüm loglar</Button>}>
        <LogTable logs={data.recent_logs} compact />
      </SectionCard>
    </Stack>
  );
}
