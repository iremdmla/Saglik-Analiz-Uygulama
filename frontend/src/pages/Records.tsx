import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import SearchIcon from "@mui/icons-material/Search";
import {
  Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, Chip, IconButton, InputAdornment, MenuItem,
  Stack, Table, TableBody, TableCell, TableHead, TableRow, TableContainer, TextField, Tooltip, Typography,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { HealthRecord, Page } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  ConfirmDialog, DemoChip, EmptyState, ErrorState, errorMessage, fmtDate, fmtRef, LoadingState, PageHeader, Pager,
  StatusChip, useAsync,
} from "../components/common";
import { CATEGORIES, RecordDialog } from "../components/MeasurementDialogs";

const PAGE_SIZE = 8;

export default function Records() {
  const [params, setParams] = useSearchParams();
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const [q, setQ] = useState("");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<HealthRecord | null>(null);
  const [dialogOpen, setDialogOpen] = useState(params.get("new") === "1");
  const [toDelete, setToDelete] = useState<HealthRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    const t = setTimeout(() => { setSearch(q); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [q]);

  const list = useAsync(() => api<Page<HealthRecord>>("/records", { query: { page, page_size: PAGE_SIZE, category, q: search } }),
    [page, category, search]);

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    if (params.get("new")) setParams({}, { replace: true });
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api(`/records/${toDelete.id}`, { method: "DELETE" });
      notify("Kayıt silindi.");
      setToDelete(null);
      list.reload();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Sağlık Verilerim" subtitle="Tahlil sonuçlarınız ve ölçüm kayıtlarınız tarih sırasıyla."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>Yeni kayıt</Button>} />

      <Card sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
          <TextField placeholder="Kayıt başlığında ara..." value={q} onChange={(e) => setQ(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
          <TextField select label="Kategori" value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} sx={{ minWidth: 220 }}>
            <MenuItem value="">Tümü</MenuItem>
            {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
        </Stack>
      </Card>

      {list.loading && !list.data ? <LoadingState rows={6} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
        !list.data?.items.length ? (
          <Card>
            <EmptyState icon={<FolderSharedOutlinedIcon fontSize="large" />} title={search || category ? "Sonuç bulunamadı" : "Henüz kayıt eklemediniz"}
              description={search || category ? "Filtreleri değiştirerek tekrar deneyin." : "Tahlil sonuçlarınızı veya ölçümlerinizi ekleyerek geçmişinizi oluşturun."}
              action={!search && !category && <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>İlk kaydı ekle</Button>} />
          </Card>
        ) : (
          <Stack spacing={1.25} sx={{ opacity: list.loading ? 0.6 : 1, transition: "opacity .2s" }}>
            {list.data.items.map((r) => (
              <Accordion key={r.id} disableGutters sx={{ borderRadius: "14px !important", border: 1, borderColor: "divider", "&::before": { display: "none" } }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.5, sm: 2 }} alignItems={{ sm: "center" }} flex={1} mr={1} minWidth={0}>
                    <Box sx={{ px: 1.25, py: 0.75, borderRadius: 2, bgcolor: (t) => alpha(t.palette.primary.main, 0.1), textAlign: "center", minWidth: 64 }}>
                      <Typography variant="caption" color="primary.main" fontWeight={700} display="block" lineHeight={1.2}>
                        {new Date(`${r.record_date}T00:00:00`).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">{r.record_date.slice(0, 4)}</Typography>
                    </Box>
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={700} noWrap>{r.title}</Typography>
                      <Typography variant="body2" color="text.secondary">{r.category} · {r.source} · {r.measurements.length} ölçüm</Typography>
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center">
                      {r.is_demo && <DemoChip />}
                      {r.document_id && <Chip size="small" label="Rapordan" variant="outlined" />}
                      {r.abnormal_count > 0
                        ? <Chip size="small" color="error" variant="outlined" label={`${r.abnormal_count} referans dışı`} />
                        : r.measurements.length > 0 && <Chip size="small" color="success" variant="outlined" label="Tümü normal" />}
                    </Stack>
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                  {r.notes && <Typography variant="body2" color="text.secondary" mb={1}>{r.notes}</Typography>}
                  <TableContainer>
                    <Table size="small">
                      <TableHead>
                        <TableRow><TableCell>Ölçüm</TableCell><TableCell align="right">Değer</TableCell><TableCell>Birim</TableCell>
                          <TableCell>Referans</TableCell><TableCell>Durum</TableCell></TableRow>
                      </TableHead>
                      <TableBody>
                        {r.measurements.map((m) => (
                          <TableRow key={m.id}>
                            <TableCell sx={{ fontWeight: 600 }}>{m.type_name}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 700 }}>{m.value}</TableCell>
                            <TableCell>{m.unit}</TableCell>
                            <TableCell>{fmtRef(m.ref_min, m.ref_max)}</TableCell>
                            <TableCell><StatusChip status={m.status} /></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1.5}>
                    <Typography variant="caption" color="text.secondary">Tarih: {fmtDate(r.record_date)}</Typography>
                    <Stack direction="row">
                      <Tooltip title="Düzenle"><IconButton onClick={() => { setEditing(r); setDialogOpen(true); }}><EditOutlinedIcon /></IconButton></Tooltip>
                      <Tooltip title="Sil"><IconButton color="error" onClick={() => setToDelete(r)}><DeleteOutlineIcon /></IconButton></Tooltip>
                    </Stack>
                  </Stack>
                </AccordionDetails>
              </Accordion>
            ))}
            <Pager page={page} pageSize={PAGE_SIZE} total={list.data.total} onChange={setPage} />
          </Stack>
        )}

      <RecordDialog open={dialogOpen} record={editing} onClose={closeDialog}
        onSaved={() => { notify(editing ? "Kayıt güncellendi." : "Kayıt eklendi."); closeDialog(); list.reload(); }} />
      <ConfirmDialog open={!!toDelete} title="Kaydı sil" busy={busy} onCancel={() => setToDelete(null)} onConfirm={remove}
        message={`"${toDelete?.title}" kaydı ve içindeki ${toDelete?.measurements.length ?? 0} ölçüm kalıcı olarak silinecek.`} />
    </>
  );
}
