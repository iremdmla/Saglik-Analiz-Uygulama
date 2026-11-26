import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import GppMaybeOutlinedIcon from "@mui/icons-material/GppMaybeOutlined";
import HowToRegOutlinedIcon from "@mui/icons-material/HowToRegOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import { Avatar, Button, Chip, List, ListItem, ListItemAvatar, ListItemText, Stack, Typography, useTheme } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useNavigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { AuditLog, User } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { ErrorState, fmtDate, LoadingState, PageHeader, SectionCard, StatCard, useAsync } from "../../components/common";
import { tokens } from "../../theme";
import { LogTable } from "./AdminLogs";

export interface AdminStatsT {
  total_users: number; active_users: number; admin_users: number; active_last_7d: number; total_records: number;
  total_measurements: number; total_documents: number; total_chat_messages: number; total_logs: number; failed_logins_7d: number;
  activity: { date: string; count: number; failed: number }[];
  actions: { action: string; count: number }[];
  record_categories: { category: string; count: number }[];
  recent_users: User[]; recent_logs: AuditLog[];
}

export function ActivityChart({ data }: { data: AdminStatsT["activity"] }) {
  const theme = useTheme();
  const points = data.map((d) => ({ ...d, label: new Date(`${d.date}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" }) }));
  return (
    <ResponsiveContainer width="100%" height={280}>
      <AreaChart data={points} margin={{ top: 10, right: 10, left: -16, bottom: 0 }}>
        <defs>
          <linearGradient id="act" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tokens.chart[0]} stopOpacity={0.3} /><stop offset="100%" stopColor={tokens.chart[0]} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme.palette.divider} />
        <XAxis dataKey="label" tick={{ fontSize: 12, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} tickLine={false} axisLine={false} />
        <Tooltip contentStyle={{ background: theme.palette.background.paper, border: `1px solid ${theme.palette.divider}`, borderRadius: 10 }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="count" name="Toplam işlem" stroke={tokens.chart[0]} strokeWidth={2.5} fill="url(#act)" />
        <Area type="monotone" dataKey="failed" name="Başarısız" stroke={tokens.status.high} strokeWidth={2} fill="transparent" />
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

  return (
    <>
      <PageHeader title={`Yönetici paneli`} subtitle={`Hoş geldiniz ${user?.full_name}. Sistemin genel durumu aşağıda.`} />
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard label="Toplam kullanıcı" value={data.total_users} icon={<PeopleOutlineIcon />} hint={`${data.admin_users} yönetici`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard label="Aktif kullanıcı" value={data.active_users} icon={<HowToRegOutlinedIcon />} color={tokens.status.normal} hint={`Son 7 günde ${data.active_last_7d} giriş`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard label="Sağlık kaydı" value={data.total_records} icon={<FolderSharedOutlinedIcon />} color={tokens.chart[1]} hint={`${data.total_measurements} ölçüm`} /></Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 2.4 }}><StatCard label="Yüklenen rapor" value={data.total_documents} icon={<DescriptionOutlinedIcon />} color={tokens.chart[2]} /></Grid>
        <Grid size={{ xs: 12, sm: 12, lg: 2.4 }}><StatCard label="Başarısız giriş" hint="Son 7 gün" value={data.failed_logins_7d} icon={<GppMaybeOutlinedIcon />} color={tokens.status.high} /></Grid>
      </Grid>
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="Son 14 gün sistem aktivitesi"><ActivityChart data={data.activity} /></SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Son kullanıcı kayıtları" pad={false} action={<Button size="small" onClick={() => navigate("/admin/users")}>Tümü</Button>}>
            <List>
              {data.recent_users.map((u) => (
                <ListItem key={u.id} sx={{ px: 2.5 }} secondaryAction={<Chip size="small" label={u.is_active ? "Aktif" : "Pasif"} color={u.is_active ? "success" : "default"} variant="outlined" />}>
                  <ListItemAvatar><Avatar sx={{ bgcolor: u.role === "ADMIN" ? "secondary.main" : "primary.main", fontSize: 14 }}>
                    {u.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</Avatar></ListItemAvatar>
                  <ListItemText primary={<Typography fontWeight={600} noWrap>{u.full_name}</Typography>} secondary={`${u.role === "ADMIN" ? "Yönetici" : "Kullanıcı"} · ${fmtDate(u.created_at)}`} />
                </ListItem>
              ))}
            </List>
          </SectionCard>
        </Grid>
      </Grid>
      <SectionCard title="Son sistem aktiviteleri" pad={false} fill={false} action={<Button size="small" onClick={() => navigate("/admin/logs")}>Tüm loglar</Button>}>
        <LogTable logs={data.recent_logs} compact />
      </SectionCard>
      <Stack mt={2}><Typography variant="caption" color="text.secondary">
        Yönetici ekranlarında kullanıcıların sağlık değerleri gösterilmez; yalnızca hesap ve sayısal özet bilgileri yer alır.
      </Typography></Stack>
    </>
  );
}
