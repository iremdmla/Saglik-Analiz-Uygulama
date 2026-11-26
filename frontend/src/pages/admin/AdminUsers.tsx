import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Outlined";
import SearchIcon from "@mui/icons-material/Search";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import {
  Alert, Avatar, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Drawer, IconButton, InputAdornment, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AuditLog, Page, User } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { useNotify } from "../../components/AppProviders";
import {
  ConfirmDialog, DemoChip, EmptyState, ErrorState, errorMessage, fmtDate, fmtDateTime, LoadingState, PageHeader, Pager, useAsync,
} from "../../components/common";
import { ACTION_LABELS } from "./AdminLogs";

type Detail = { user: User; has_profile: boolean; record_count: number; measurement_count: number; document_count: number; recent_activity: AuditLog[] };

function UserDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useAsync(() => (id ? api<Detail>(`/admin/users/${id}`) : Promise.resolve(null)), [id]);
  const d = detail.data;
  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 420 }, p: 3 } }}>
      {detail.loading || !d ? <LoadingState rows={5} /> : (
        <Stack spacing={2.5}>
          <Stack direction="row" spacing={2} alignItems="center">
            <Avatar sx={{ width: 56, height: 56, bgcolor: "primary.main" }}>{d.user.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}</Avatar>
            <Box minWidth={0}>
              <Typography variant="h6">{d.user.full_name}</Typography>
              <Typography color="text.secondary" noWrap>{d.user.email}</Typography>
            </Box>
          </Stack>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={d.user.role === "ADMIN" ? "Yönetici" : "Kullanıcı"} color={d.user.role === "ADMIN" ? "secondary" : "primary"} />
            <Chip size="small" label={d.user.is_active ? "Aktif" : "Pasif"} color={d.user.is_active ? "success" : "default"} variant="outlined" />
            {d.user.is_demo && <DemoChip />}
          </Stack>
          <Divider />
          {[["Kayıt tarihi", fmtDateTime(d.user.created_at)], ["Son giriş", fmtDateTime(d.user.last_login_at)],
            ["Sağlık profili", d.has_profile ? "Var" : "Yok"], ["Sağlık kaydı sayısı", d.record_count], ["Ölçüm sayısı", d.measurement_count],
            ["Yüklenen rapor", d.document_count]].map(([k, v]) => (
            <Stack key={k as string} direction="row" justifyContent="space-between"><Typography color="text.secondary">{k}</Typography><Typography fontWeight={600}>{v}</Typography></Stack>
          ))}
          <Alert severity="info" variant="outlined">Gizlilik gereği yönetici ekranında sağlık değerleri gösterilmez.</Alert>
          <Typography variant="subtitle2">Son aktiviteler</Typography>
          <Stack spacing={1}>
            {d.recent_activity.map((l) => (
              <Stack key={l.id} direction="row" justifyContent="space-between" spacing={1}>
                <Typography variant="body2">{ACTION_LABELS[l.action] ?? l.action}{!l.success && " (başarısız)"}</Typography>
                <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">{fmtDateTime(l.created_at)}</Typography>
              </Stack>
            ))}
            {!d.recent_activity.length && <Typography variant="body2" color="text.secondary">Aktivite yok.</Typography>}
          </Stack>
        </Stack>
      )}
    </Drawer>
  );
}

function CreateUserDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState({ full_name: "", email: "", password: "", role: "USER" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (open) { setF({ full_name: "", email: "", password: "", role: "USER" }); setError(""); } }, [open]);
  const save = async () => {
    setBusy(true);
    try {
      await api("/admin/users", { method: "POST", body: f });
      onCreated();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Yeni kullanıcı oluştur</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Ad Soyad" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
          <TextField label="E-posta" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <TextField label="Geçici şifre" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required helperText="En az 8 karakter" />
          <TextField select label="Rol" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <MenuItem value="USER">Kullanıcı</MenuItem><MenuItem value="ADMIN">Yönetici</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" onClick={save} disabled={busy}>{busy ? <CircularProgress size={18} color="inherit" /> : "Oluştur"}</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function AdminUsers() {
  const { user: me } = useAuth();
  const notify = useNotify();
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [detailId, setDetailId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [toggle, setToggle] = useState<User | null>(null);
  const [busy, setBusy] = useState(false);
  const list = useAsync(() => api<Page<User>>("/admin/users", { query: { q: search, role, active, page, page_size: 10 } }), [search, role, active, page]);

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const applyToggle = async () => {
    if (!toggle) return;
    setBusy(true);
    try {
      await api(`/admin/users/${toggle.id}/status`, { method: "PATCH", body: { is_active: !toggle.is_active } });
      notify(`${toggle.full_name} hesabı ${toggle.is_active ? "pasif" : "aktif"} yapıldı.`);
      setToggle(null);
      list.reload();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Kullanıcı Yönetimi" subtitle="Hesapları görüntüleyin, arayın ve gerektiğinde pasif hâle getirin."
        action={<Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setCreating(true)}>Kullanıcı ekle</Button>} />
      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField placeholder="Ad, e-posta veya kullanıcı adı ara..." value={q} onChange={(e) => setQ(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          <TextField select label="Rol" value={role} onChange={(e) => { setRole(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
            <MenuItem value="">Tümü</MenuItem><MenuItem value="USER">Kullanıcı</MenuItem><MenuItem value="ADMIN">Yönetici</MenuItem>
          </TextField>
          <TextField select label="Durum" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }} sx={{ minWidth: 160 }}>
            <MenuItem value="">Tümü</MenuItem><MenuItem value="true">Aktif</MenuItem><MenuItem value="false">Pasif</MenuItem>
          </TextField>
        </Stack>
      </Card>
      <Card>
        {list.loading && !list.data ? <Box p={2}><LoadingState rows={5} /></Box> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
          !list.data?.items.length ? <EmptyState title="Kullanıcı bulunamadı" /> : (
            <>
              <TableContainer>
                <Table>
                  <TableHead><TableRow><TableCell>Kullanıcı</TableCell><TableCell>Rol</TableCell><TableCell>Kayıt</TableCell>
                    <TableCell>Son giriş</TableCell><TableCell>Durum</TableCell><TableCell align="right">İşlemler</TableCell></TableRow></TableHead>
                  <TableBody>
                    {list.data.items.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <Avatar sx={{ width: 36, height: 36, fontSize: 14, bgcolor: u.role === "ADMIN" ? "secondary.main" : "primary.main" }}>
                              {u.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                            </Avatar>
                            <Box minWidth={0}>
                              <Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={600}>{u.full_name}</Typography>{u.is_demo && <DemoChip />}</Stack>
                              <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell><Chip size="small" label={u.role === "ADMIN" ? "Yönetici" : "Kullanıcı"} color={u.role === "ADMIN" ? "secondary" : "primary"} variant="outlined" /></TableCell>
                        <TableCell>{fmtDate(u.created_at)}</TableCell>
                        <TableCell>{fmtDateTime(u.last_login_at)}</TableCell>
                        <TableCell>
                          <Tooltip title={u.id === me?.id ? "Kendi hesabınızı pasif yapamazsınız" : u.is_active ? "Pasif yap" : "Aktif yap"}>
                            <span><Switch checked={u.is_active} disabled={u.id === me?.id} onChange={() => setToggle(u)} color="success" /></span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Detaylar"><IconButton onClick={() => setDetailId(u.id)}><VisibilityOutlinedIcon /></IconButton></Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box px={2} pb={2}><Pager page={page} pageSize={10} total={list.data.total} onChange={setPage} /></Box>
            </>
          )}
      </Card>
      <UserDrawer id={detailId} onClose={() => setDetailId(null)} />
      <CreateUserDialog open={creating} onClose={() => setCreating(false)} onCreated={() => { setCreating(false); notify("Kullanıcı oluşturuldu."); list.reload(); }} />
      <ConfirmDialog open={!!toggle} busy={busy} onCancel={() => setToggle(null)} onConfirm={applyToggle}
        title={toggle?.is_active ? "Hesabı pasif yap" : "Hesabı aktif yap"} confirmText={toggle?.is_active ? "Pasif yap" : "Aktif yap"}
        message={toggle?.is_active ? `${toggle?.full_name} artık giriş yapamayacak ve açık oturumları sonlandırılacak.` : `${toggle?.full_name} yeniden giriş yapabilecek.`} />
    </>
  );
}
