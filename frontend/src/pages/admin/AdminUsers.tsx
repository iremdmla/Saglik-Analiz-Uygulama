import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import PersonAddAlt1OutlinedIcon from "@mui/icons-material/PersonAddAlt1Rounded";
import SearchIcon from "@mui/icons-material/SearchRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityRounded";
import {
  Alert, alpha, Avatar, Box, Button, Card, Chip, CircularProgress, Dialog, DialogActions, DialogContent, Divider,
  Drawer, InputAdornment, MenuItem, Stack, Switch, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { api } from "../../api/client";
import type { AuditLog, Page, User } from "../../api/types";
import { useAuth } from "../../auth/AuthContext";
import { useNotify } from "../../components/AppProviders";
import {
  ConfirmDialog, DemoChip, DialogHeader, EmptyState, ErrorState, errorMessage, fmtDate, fmtDateTime, IconTile, initials, LoadingState,
  PageHeader, Pager, useAsync,
} from "../../components/common";
import { gradients, palette } from "../../theme";
import { actionMeta } from "./AdminLogs";

const RoleChip = ({ admin }: { admin: boolean }) => (
  <Chip size="small" label={admin ? "Yönetici" : "Kullanıcı"} sx={{ bgcolor: alpha(admin ? palette.violet : palette.teal, 0.12), color: admin ? palette.violet : palette.teal }} />
);

type Detail = { user: User; has_profile: boolean; record_count: number; measurement_count: number; document_count: number; recent_activity: AuditLog[] };

function UserDrawer({ id, onClose }: { id: number | null; onClose: () => void }) {
  const detail = useAsync(() => (id ? api<Detail>(`/admin/users/${id}`) : Promise.resolve(null)), [id]);
  const d = detail.data;
  return (
    <Drawer anchor="right" open={!!id} onClose={onClose} PaperProps={{ sx: { width: { xs: "100%", sm: 440 }, bgcolor: "background.default" } }}>
      {detail.loading || !d ? <Box p={3}><LoadingState rows={5} /></Box> : (
        <Stack spacing={2.5}>
          <Box sx={{ p: 3, pb: 4, color: "#fff", background: gradients.hero, position: "relative", overflow: "hidden" }}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ width: 64, height: 64, fontWeight: 800, fontSize: 22, background: gradients.aurora, border: `3px solid ${alpha("#fff", 0.3)}` }}>{initials(d.user.full_name)}</Avatar>
              <Box minWidth={0}>
                <Typography variant="h6">{d.user.full_name}</Typography>
                <Typography sx={{ opacity: 0.8 }} noWrap>{d.user.email}</Typography>
                <Stack direction="row" spacing={1} mt={1}>
                  <Chip size="small" label={d.user.role === "ADMIN" ? "Yönetici" : "Kullanıcı"} sx={{ bgcolor: alpha("#fff", 0.18), color: "#fff" }} />
                  <Chip size="small" label={d.user.is_active ? "Aktif" : "Pasif"} sx={{ bgcolor: d.user.is_active ? alpha(palette.green, 0.35) : alpha("#fff", 0.15), color: "#fff" }} />
                </Stack>
              </Box>
            </Stack>
          </Box>
          <Box px={3}>
          <Box display="grid" gridTemplateColumns="1fr 1fr 1fr" gap={1.25} mb={2}>
            {[["Kayıt", d.record_count, palette.blue], ["Ölçüm", d.measurement_count, palette.pink], ["Rapor", d.document_count, palette.amber]].map(([k, v, c]) => (
              <Box key={k as string} sx={{ p: 1.5, borderRadius: 3.5, bgcolor: alpha(c as string, 0.1), textAlign: "center" }}>
                <Typography variant="h5" sx={{ color: c as string }}>{v}</Typography><Typography variant="caption" color="text.secondary">{k}</Typography>
              </Box>
            ))}
          </Box>
          <Stack spacing={1}>
          {[["Kayıt tarihi", fmtDateTime(d.user.created_at)], ["Son giriş", fmtDateTime(d.user.last_login_at)], ["Sağlık profili", d.has_profile ? "Var" : "Yok"]].map(([k, v]) => (
            <Stack key={k as string} direction="row" justifyContent="space-between" sx={{ p: 1.25, borderRadius: 3, bgcolor: "background.paper", border: 1, borderColor: "divider" }}>
              <Typography color="text.secondary">{k}</Typography><Typography fontWeight={700}>{v}</Typography></Stack>
          ))}
          </Stack>
          <Stack direction="row" spacing={1.25} alignItems="center" sx={{ my: 2, p: 1.5, borderRadius: 3.5, bgcolor: alpha(palette.violet, 0.08) }}>
            <ShieldRoundedIcon sx={{ color: palette.violet }} />
            <Typography variant="body2" color="text.secondary">Gizlilik gereği yönetici ekranında sağlık değerleri gösterilmez.</Typography>
          </Stack>
          <Divider />
          <Typography variant="overline" color="text.secondary" display="block" mt={1.5}>Son aktiviteler</Typography>
          <Stack spacing={1} pb={3}>
            {d.recent_activity.map((l) => {
              const m = actionMeta(l.action);
              return (
                <Stack key={l.id} direction="row" spacing={1.25} alignItems="center">
                  <IconTile icon={m.icon} color={l.success ? m.color : palette.coral} size={30} />
                  <Typography variant="body2" fontWeight={600} flex={1}>{m.label}{!l.success && " (başarısız)"}</Typography>
                  <Typography variant="caption" color="text.secondary" whiteSpace="nowrap">{fmtDateTime(l.created_at)}</Typography>
                </Stack>
              );
            })}
            {!d.recent_activity.length && <Typography variant="body2" color="text.secondary">Aktivite yok.</Typography>}
          </Stack>
          </Box>
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
      <DialogHeader icon={<PersonAddAlt1OutlinedIcon />} color={palette.blue} title="Yeni kullanıcı oluştur" subtitle="Hesap geçici şifreyle oluşturulur" />
      <DialogContent>
        <Stack spacing={2} pt={2.5}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Ad Soyad" value={f.full_name} onChange={(e) => setF({ ...f, full_name: e.target.value })} required />
          <TextField label="E-posta" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} required />
          <TextField label="Geçici şifre" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} required helperText="En az 8 karakter" />
          <TextField select label="Rol" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })}>
            <MenuItem value="USER">Kullanıcı</MenuItem><MenuItem value="ADMIN">Yönetici</MenuItem>
          </TextField>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2.5, borderTop: 1, borderColor: "divider" }}>
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
      <PageHeader title="Kullanıcı Yönetimi" eyebrow="Yönetim" subtitle="Hesapları görüntüleyin, arayın ve gerektiğinde pasif hâle getirin."
        icon={<PeopleAltRoundedIcon />} color={palette.blue}
        action={<Button variant="contained" startIcon={<PersonAddAlt1OutlinedIcon />} onClick={() => setCreating(true)}>Kullanıcı ekle</Button>} />
      <Card sx={{ p: 2.5, mb: 2.5 }}>
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
                            <Avatar sx={{ width: 40, height: 40, fontSize: 14, fontWeight: 800, background: u.role === "ADMIN" ? gradients.violet : gradients.brand }}>
                              {initials(u.full_name)}
                            </Avatar>
                            <Box minWidth={0}>
                              <Stack direction="row" spacing={1} alignItems="center"><Typography fontWeight={600}>{u.full_name}</Typography>{u.is_demo && <DemoChip />}</Stack>
                              <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                            </Box>
                          </Stack>
                        </TableCell>
                        <TableCell><RoleChip admin={u.role === "ADMIN"} /></TableCell>
                        <TableCell>{fmtDate(u.created_at)}</TableCell>
                        <TableCell>{fmtDateTime(u.last_login_at)}</TableCell>
                        <TableCell>
                          <Tooltip title={u.id === me?.id ? "Kendi hesabınızı pasif yapamazsınız" : u.is_active ? "Pasif yap" : "Aktif yap"}>
                            <span><Switch checked={u.is_active} disabled={u.id === me?.id} onChange={() => setToggle(u)} color="success" /></span>
                          </Tooltip>
                        </TableCell>
                        <TableCell align="right">
                          <Button size="small" variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={() => setDetailId(u.id)}>Detay</Button>
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
      <ConfirmDialog open={!!toggle} busy={busy} tone={toggle?.is_active ? "danger" : "primary"} onCancel={() => setToggle(null)} onConfirm={applyToggle}
        title={toggle?.is_active ? "Hesabı pasif yap" : "Hesabı aktif yap"} confirmText={toggle?.is_active ? "Pasif yap" : "Aktif yap"}
        message={toggle?.is_active ? `${toggle?.full_name} artık giriş yapamayacak ve açık oturumları sonlandırılacak.` : `${toggle?.full_name} yeniden giriş yapabilecek.`} />
    </>
  );
}
