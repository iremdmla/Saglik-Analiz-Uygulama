import FilterAltOffOutlinedIcon from "@mui/icons-material/FilterAltOffOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import {
  Box, Button, Card, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AuditLog, Page, User } from "../../api/types";
import { DemoChip, EmptyState, ErrorState, fmtDateTime, LoadingState, PageHeader, Pager, useAsync } from "../../components/common";

export const ACTION_LABELS: Record<string, string> = {
  LOGIN: "Giriş", LOGOUT: "Çıkış", LOGIN_FAILED: "Başarısız giriş", REGISTER: "Kayıt", USER_CREATE: "Kullanıcı oluşturma",
  USER_STATUS_CHANGE: "Hesap durumu", PROFILE_UPDATE: "Profil güncelleme", RECORD_CREATE: "Kayıt ekleme",
  RECORD_UPDATE: "Kayıt güncelleme", RECORD_DELETE: "Kayıt silme", MEASUREMENT_CREATE: "Ölçüm ekleme",
  MEASUREMENT_UPDATE: "Ölçüm güncelleme", MEASUREMENT_DELETE: "Ölçüm silme", DOCUMENT_UPLOAD: "Rapor yükleme",
  DOCUMENT_IMPORT: "Rapor aktarımı", DOCUMENT_DELETE: "Rapor silme", UNAUTHORIZED_ACCESS: "Yetkisiz erişim",
  PASSWORD_CHANGE: "Şifre değişikliği", ANALYSIS_RUN: "Analiz", ASSISTANT_CHAT: "Asistan kullanımı",
};

export function LogTable({ logs, compact }: { logs: AuditLog[]; compact?: boolean }) {
  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Tarih</TableCell><TableCell>Kullanıcı</TableCell><TableCell>İşlem</TableCell><TableCell>Açıklama</TableCell>
            {!compact && <><TableCell>İlgili kayıt</TableCell><TableCell>IP</TableCell></>}<TableCell>Sonuç</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {logs.map((l) => (
            <TableRow key={l.id} hover>
              <TableCell sx={{ whiteSpace: "nowrap" }}>{fmtDateTime(l.created_at)}</TableCell>
              <TableCell sx={{ maxWidth: 200 }}><Typography variant="body2" noWrap>{l.actor ?? "—"}</Typography></TableCell>
              <TableCell><Chip size="small" variant="outlined" label={ACTION_LABELS[l.action] ?? l.action} /></TableCell>
              <TableCell sx={{ minWidth: 220 }}>
                <Stack direction="row" spacing={1} alignItems="center"><span>{l.description}</span>{l.is_demo && <DemoChip />}</Stack>
              </TableCell>
              {!compact && <>
                <TableCell>{l.entity_type ? `${l.entity_type}${l.entity_id ? ` #${l.entity_id}` : ""}` : "—"}</TableCell>
                <TableCell>{l.ip_address ?? "—"}</TableCell>
              </>}
              <TableCell><Chip size="small" label={l.success ? "Başarılı" : "Başarısız"} color={l.success ? "success" : "error"} variant="outlined" /></TableCell>
            </TableRow>
          ))}
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

  useEffect(() => {
    const t = setTimeout(() => { setF((x) => (x.q === q ? x : { ...x, q })); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <>
      <PageHeader title="Sistem Logları" subtitle="Güvenlik ve denetim kayıtları. En yeni işlemler en üstte gösterilir."
        action={<Button startIcon={<FilterAltOffOutlinedIcon />} onClick={() => { setF(EMPTY); setQ(""); setPage(1); }}>Filtreleri temizle</Button>} />
      <Card sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField type="date" label="Başlangıç" value={f.date_from} onChange={set("date_from")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField type="date" label="Bitiş" value={f.date_to} onChange={set("date_to")} slotProps={{ inputLabel: { shrink: true } }} />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField select label="Kullanıcı" value={f.user_id} onChange={set("user_id")}>
              <MenuItem value="">Tümü</MenuItem>
              {(users.data?.items ?? []).map((u) => <MenuItem key={u.id} value={String(u.id)}>{u.full_name}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField select label="İşlem türü" value={f.action} onChange={set("action")}>
              <MenuItem value="">Tümü</MenuItem>
              {(actions.data ?? []).map((a) => <MenuItem key={a} value={a}>{ACTION_LABELS[a] ?? a}</MenuItem>)}
            </TextField>
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 2.4 }}>
            <TextField select label="Sonuç" value={f.success} onChange={set("success")}>
              <MenuItem value="">Tümü</MenuItem>
              <MenuItem value="true">Başarılı</MenuItem>
              <MenuItem value="false">Başarısız</MenuItem>
            </TextField>
          </Grid>
          <Grid size={12}>
            <TextField placeholder="Açıklama veya kullanıcı e-postasında ara..." value={q} onChange={(e) => setQ(e.target.value)} />
          </Grid>
        </Grid>
      </Card>
      <Card>
        {logs.loading && !logs.data ? <Box p={2}><LoadingState rows={8} /></Box> : logs.error ? <ErrorState message={logs.error} onRetry={logs.reload} /> :
          !logs.data?.items.length ? <EmptyState icon={<ReceiptLongOutlinedIcon fontSize="large" />} title="Log kaydı bulunamadı" description="Filtreleri değiştirmeyi deneyin." /> : (
            <Box sx={{ opacity: logs.loading ? 0.6 : 1 }}>
              <LogTable logs={logs.data.items} />
              <Box px={2} pb={2}><Pager page={page} pageSize={15} total={logs.data.total} onChange={setPage} /></Box>
            </Box>
          )}
      </Card>
    </>
  );
}
