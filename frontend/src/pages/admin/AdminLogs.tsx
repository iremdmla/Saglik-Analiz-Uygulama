import AddCircleRoundedIcon from "@mui/icons-material/AddCircleRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DeleteRoundedIcon from "@mui/icons-material/DeleteRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import FilterAltOffRoundedIcon from "@mui/icons-material/FilterAltOffRounded";
import GppBadRoundedIcon from "@mui/icons-material/GppBadRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import KeyRoundedIcon from "@mui/icons-material/KeyRounded";
import LoginRoundedIcon from "@mui/icons-material/LoginRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PersonAddRoundedIcon from "@mui/icons-material/PersonAddRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import ToggleOnRoundedIcon from "@mui/icons-material/ToggleOnRounded";
import {
  alpha, Box, Button, Card, Chip, InputAdornment, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useState, type ReactNode } from "react";
import { api } from "../../api/client";
import type { AuditLog, Page, User } from "../../api/types";
import { DemoChip, EmptyState, ErrorState, fmtDateTime, IconTile, LoadingState, PageHeader, Pager, useAsync } from "../../components/common";
import { palette } from "../../theme";

/** İşlem türlerinin etiketi, rengi ve ikonu: loglar her ekranda aynı görsel dille gösterilir. */
export const ACTION_META: Record<string, { label: string; color: string; icon: ReactNode }> = {
  LOGIN: { label: "Giriş", color: palette.teal, icon: <LoginRoundedIcon /> },
  LOGOUT: { label: "Çıkış", color: palette.slate, icon: <LogoutRoundedIcon /> },
  LOGIN_FAILED: { label: "Başarısız giriş", color: palette.coral, icon: <GppBadRoundedIcon /> },
  REGISTER: { label: "Kayıt", color: palette.blue, icon: <PersonAddRoundedIcon /> },
  USER_CREATE: { label: "Kullanıcı oluşturma", color: palette.blue, icon: <PersonAddRoundedIcon /> },
  USER_STATUS_CHANGE: { label: "Hesap durumu", color: palette.amber, icon: <ToggleOnRoundedIcon /> },
  PROFILE_UPDATE: { label: "Profil güncelleme", color: palette.pink, icon: <EditRoundedIcon /> },
  RECORD_CREATE: { label: "Kayıt ekleme", color: palette.green, icon: <AddCircleRoundedIcon /> },
  RECORD_UPDATE: { label: "Kayıt güncelleme", color: palette.blue, icon: <EditRoundedIcon /> },
  RECORD_DELETE: { label: "Kayıt silme", color: palette.coral, icon: <DeleteRoundedIcon /> },
  MEASUREMENT_CREATE: { label: "Ölçüm ekleme", color: palette.green, icon: <AddCircleRoundedIcon /> },
  MEASUREMENT_UPDATE: { label: "Ölçüm güncelleme", color: palette.blue, icon: <EditRoundedIcon /> },
  MEASUREMENT_DELETE: { label: "Ölçüm silme", color: palette.coral, icon: <DeleteRoundedIcon /> },
  DOCUMENT_UPLOAD: { label: "Rapor yükleme", color: palette.amber, icon: <DescriptionRoundedIcon /> },
  DOCUMENT_IMPORT: { label: "Rapor aktarımı", color: palette.amber, icon: <DescriptionRoundedIcon /> },
  DOCUMENT_DELETE: { label: "Rapor silme", color: palette.coral, icon: <DeleteRoundedIcon /> },
  UNAUTHORIZED_ACCESS: { label: "Yetkisiz erişim", color: palette.coral, icon: <GppBadRoundedIcon /> },
  PASSWORD_CHANGE: { label: "Şifre değişikliği", color: palette.violet, icon: <KeyRoundedIcon /> },
  ANALYSIS_RUN: { label: "Analiz", color: palette.green, icon: <InsightsRoundedIcon /> },
  ASSISTANT_CHAT: { label: "Asistan kullanımı", color: palette.violet, icon: <AutoAwesomeRoundedIcon /> },
};
export const actionMeta = (a: string) => ACTION_META[a] ?? { label: a, color: palette.slate, icon: <ReceiptLongRoundedIcon /> };
export const ACTION_LABELS = Object.fromEntries(Object.entries(ACTION_META).map(([k, v]) => [k, v.label]));

export function LogTable({ logs, compact }: { logs: AuditLog[]; compact?: boolean }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>İşlem</TableCell><TableCell>Kullanıcı</TableCell><TableCell>Açıklama</TableCell>
            {!compact && <><TableCell>İlgili kayıt</TableCell><TableCell>IP</TableCell></>}<TableCell>Tarih</TableCell><TableCell>Sonuç</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((l) => {
            const m = actionMeta(l.action);
            return (
              <TableRow key={l.id} hover sx={{ bgcolor: l.success ? undefined : alpha(palette.coral, 0.04) }}>
                <TableCell>
                  <Stack direction="row" spacing={1.25} alignItems="center">
                    <IconTile icon={m.icon} color={m.color} size={30} />
                    <Typography fontWeight={700} fontSize={13.5} whiteSpace="nowrap">{m.label}</Typography>
                  </Stack>
                </TableCell>
                <TableCell sx={{ maxWidth: 210 }}><Typography variant="body2" noWrap>{l.actor ?? "—"}</Typography></TableCell>
                <TableCell sx={{ minWidth: 220 }}>
                  <Stack direction="row" spacing={1} alignItems="center"><span>{l.description}</span>{l.is_demo && <DemoChip />}</Stack>
                </TableCell>
                {!compact && <>
                  <TableCell sx={{ whiteSpace: "nowrap" }}>{l.entity_type ? `${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ""}` : "—"}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace", fontSize: 12.5 }}>{l.ip_address ?? "—"}</TableCell>
                </>}
                <TableCell sx={{ whiteSpace: "nowrap", color: "text.secondary" }}>{fmtDateTime(l.created_at)}</TableCell>
                <TableCell>
                  <Chip size="small" label={l.success ? "Başarılı" : "Başarısız"}
                    icon={<Box component="span" sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: l.success ? palette.green : palette.coral, ml: "10px !important" }} />}
                    sx={{ bgcolor: alpha(l.success ? palette.green : palette.coral, 0.12), color: l.success ? palette.green : palette.coral }} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

const EMPTY = { user_id: "", action: "", success: "", date_from: "", date_to: "", q: "" };

export default function AdminLogs() {
  const [f, setF] = useState(EMPTY);
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const actions = useAsync(() => api<string[]>("/admin/logs/actions"), []);
  const users = useAsync(() => api<Page<User>>("/admin/users", { query: { page_size: 50 } }), []);
  const logs = useAsync(() => api<Page<AuditLog>>("/admin/logs", { query: { ...f, page, page_size: 15 } }), [f, page]);
  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => { setF({ ...f, [k]: e.target.value }); setPage(1); };
  const setSuccess = (v: string) => { setF({ ...f, success: v }); setPage(1); };

  useEffect(() => {
    const t = setTimeout(() => { setF((x) => (x.q === q ? x : { ...x, q })); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <>
      <PageHeader title="Sistem Logları" eyebrow="Denetim" subtitle="Güvenlik ve denetim kayıtları. En yeni işlemler en üstte gösterilir."
        icon={<ReceiptLongRoundedIcon />} color={palette.amber}
        action={<Button variant="outlined" startIcon={<FilterAltOffRoundedIcon />} onClick={() => { setF(EMPTY); setQ(""); setPage(1); }}>Filtreleri temizle</Button>} />
      <Card sx={{ p: 2.5, mb: 2.5 }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, md: 6 }}>
            <TextField placeholder="Açıklama veya kullanıcı e-postasında ara..." value={q} onChange={(e) => setQ(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />
          </Grid>
          <Grid size={{ xs: 12, md: 6 }}>
            <Stack direction="row" spacing={1} alignItems="center" height="100%">
              {[["", "Tüm sonuçlar", palette.teal], ["true", "Başarılı", palette.green], ["false", "Başarısız", palette.coral]].map(([v, label, c]) => (
                <Chip key={v} label={label} onClick={() => setSuccess(v)}
                  sx={{ bgcolor: f.success === v ? c : alpha(c, 0.1), color: f.success === v ? "#fff" : c, "&:hover": { bgcolor: f.success === v ? c : alpha(c, 0.18) } }} />
              ))}
            </Stack>
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField type="date" label="Başlangıç" value={f.date_from} onChange={set("date_from")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 6, md: 3 }}>
            <TextField type="date" label="Bitiş" value={f.date_to} onChange={set("date_to")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField select label="Kullanıcı" value={f.user_id} onChange={set("user_id")}>
              <MenuItem value="">Tümü</MenuItem>
              {(users.data?.items ?? []).map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.full_name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
            <TextField select label="İşlem türü" value={f.action} onChange={set("action")}>
              <MenuItem value="">Tümü</MenuItem>
              {(actions.data ?? []).map((a) => (
                <MenuItem key={a} value={a}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: actionMeta(a).color }} /><span>{actionMeta(a).label}</span>
                  </Stack>
                </MenuItem>
              ))}
            </TextField>
          </Grid>
        </Grid>
      </Card>
      <Card>
        {logs.loading && !logs.data ? <Box p={2}><LoadingState rows={8} /></Box> : logs.error ? <ErrorState message={logs.error} onRetry={logs.reload} /> :
          !logs.data?.items.length ? <EmptyState icon={<ReceiptLongRoundedIcon />} color={palette.amber} title="Log kaydı bulunamadı" description="Filtreleri değiştirmeyi deneyin." /> : (
            <Box sx={{ opacity: logs.loading ? 0.6 : 1, transition: "opacity .2s" }}>
              <LogTable logs={logs.data.items} />
              <Box px={2.5} pb={2}><Pager page={page} pageSize={15} total={logs.data.total} onChange={setPage} /></Box>
            </Box>
          )}
      </Card>
    </>
  );
}
