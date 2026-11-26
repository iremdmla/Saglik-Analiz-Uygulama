import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import DataUsageRoundedIcon from "@mui/icons-material/DataUsageRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import { alpha, Chip, LinearProgress, Stack, Typography, useTheme } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { User } from "../../api/types";
import { ErrorState, LoadingState, PageHeader, SectionCard, useAsync } from "../../components/common";
import { useChartTooltip } from "../../components/TrendChart";
import { colorFor, palette } from "../../theme";
import { ActivityChart, type AdminStatsT } from "./AdminDashboard";
import { actionMeta } from "./AdminLogs";

type Demo = { environment: string; seed_enabled: boolean; demo_users: User[]; demo_records: number; demo_measurements: number; demo_documents: number; demo_logs: number };

export default function AdminStats() {
  const theme = useTheme();
  const tip = useChartTooltip();
  const stats = useAsync(() => api<AdminStatsT>("/admin/stats"), []);
  const demo = useAsync(() => api<Demo>("/admin/demo"), []);
  if (stats.loading) return <LoadingState rows={6} />;
  if (stats.error || !stats.data) return <ErrorState message={stats.error ?? ""} onRetry={stats.reload} />;
  const s = stats.data;
  const actions = s.actions.slice(0, 10).map((a) => ({ ...a, label: actionMeta(a.action).label, color: actionMeta(a.action).color }));
  const activeRatio = s.total_users ? Math.round((s.active_users / s.total_users) * 100) : 0;

  return (
    <>
      <PageHeader title="Sistem İstatistikleri" eyebrow="Raporlama" subtitle="Kullanım, veri hacmi ve demo verisi durumu."
        icon={<BarChartRoundedIcon />} color={palette.violet} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard title="İşlem türü dağılımı" icon={<BarChartRoundedIcon />} color={palette.violet}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={actions} layout="vertical" margin={{ left: 40, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={theme.palette.divider} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={120} tick={{ fontSize: 12, fill: theme.palette.text.secondary }} axisLine={false} tickLine={false} />
                <Tooltip {...tip} cursor={{ fill: theme.palette.action.hover }} />
                <Bar dataKey="count" name="Adet" radius={[0, 8, 8, 0]} barSize={16}>
                  {actions.map((a) => <Cell key={a.action} fill={a.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <SectionCard title="Kayıt kategorileri" icon={<CategoryRoundedIcon />} color={palette.blue}>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={s.record_categories} dataKey="count" nameKey="category" innerRadius={62} outerRadius={95} paddingAngle={3} cornerRadius={6}>
                  {s.record_categories.map((c) => <Cell key={c.category} fill={colorFor(c.category)} stroke="none" />)}
                </Pie>
                <Tooltip {...tip} />
              </PieChart>
            </ResponsiveContainer>
            <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center">
              {s.record_categories.map((c) => (
                <Chip key={c.category} size="small" label={`${c.category}: ${c.count}`}
                  sx={{ bgcolor: alpha(colorFor(c.category), 0.12), color: colorFor(c.category) }} />
              ))}
            </Stack>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 7 }}>
          <SectionCard title="Günlük aktivite (14 gün)" icon={<ShowChartRoundedIcon />} color={palette.teal}><ActivityChart data={s.activity} /></SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 5 }}>
          <Stack spacing={2} height="100%">
            <SectionCard title="Hesap durumu" icon={<DataUsageRoundedIcon />} color={palette.green} fill={false}>
              <Typography variant="body2" color="text.secondary">Aktif hesap oranı</Typography>
              <Stack direction="row" alignItems="center" spacing={2} mt={1}>
                <LinearProgress variant="determinate" value={activeRatio} sx={{ flex: 1, height: 10, borderRadius: 5 }} color="success" />
                <Typography fontWeight={700}>%{activeRatio}</Typography>
              </Stack>
              <Grid container spacing={1} mt={2}>
                {[["Toplam ölçüm", s.total_measurements], ["Asistan mesajı", s.total_chat_messages], ["Log kaydı", s.total_logs], ["Yönetici", s.admin_users]].map(([k, v]) => (
                  <Grid key={k as string} size={6}><Typography variant="caption" color="text.secondary">{k}</Typography><Typography variant="h6">{v}</Typography></Grid>
                ))}
              </Grid>
            </SectionCard>
            <SectionCard title="Demo verisi durumu" icon={<ScienceRoundedIcon />} color={palette.violet} fill={false}>
              {demo.data ? (
                <Stack spacing={1}>
                  <Stack direction="row" spacing={1}>
                    <Chip size="small" label={`Ortam: ${demo.data.environment}`} />
                    <Chip size="small" color={demo.data.seed_enabled ? "success" : "default"} label={demo.data.seed_enabled ? "Seed etkin" : "Seed kapalı"} variant="outlined" />
                  </Stack>
                  <Typography variant="body2">{demo.data.demo_users.length} demo hesap · {demo.data.demo_records} kayıt · {demo.data.demo_measurements} ölçüm · {demo.data.demo_documents} rapor · {demo.data.demo_logs} log</Typography>
                  <Typography variant="caption" color="text.secondary">Tüm demo kayıtları "is_demo" olarak işaretlidir ve sentetiktir. Yeniden oluşturmak için README'deki reset-demo komutunu kullanın.</Typography>
                </Stack>
              ) : <LoadingState rows={2} />}
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
