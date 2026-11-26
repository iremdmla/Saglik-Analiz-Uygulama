import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ExpandMoreRoundedIcon from "@mui/icons-material/ExpandMoreRounded";
import FolderSharedRoundedIcon from "@mui/icons-material/FolderSharedRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import {
  Accordion, AccordionDetails, AccordionSummary, alpha, Box, Button, Card, Chip, IconButton, InputAdornment, Stack,
  TextField, Tooltip, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { HealthRecord, Page } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  ConfirmDialog, DemoChip, EmptyState, ErrorState, errorMessage, fmtDate, fmtNum, fmtRef, IconTile, LoadingState, PageHeader, Pager,
  RangeBar, useAsync,
} from "../components/common";
import { iconFor } from "../components/icons";
import { CATEGORIES, RecordDialog } from "../components/MeasurementDialogs";
import { colorFor, palette, statusMeta } from "../theme";

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

  const list = useAsync(() => api<Page<HealthRecord>>("/records", { query: { page, page_size: PAGE_SIZE, category, q: search } }), [page, category, search]);

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
      <PageHeader title="Sağlık Verilerim" eyebrow="Kayıtlar" subtitle="Tahlil sonuçlarınız ve ölçüm kayıtlarınız tarih sırasıyla."
        icon={<FolderSharedRoundedIcon />} color={palette.blue}
        action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialogOpen(true)}>Yeni kayıt</Button>} />

      <Card sx={{ p: 2, mb: 2.5 }}>
        <Stack spacing={1.75}>
          <TextField placeholder="Kayıt başlığında ara..." value={q} onChange={(e) => setQ(e.target.value)}
            slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} />
          <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            {["", ...CATEGORIES].map((c) => {
              const color = c ? colorFor(c) : palette.teal;
              const on = category === c;
              return (
                <Chip key={c || "all"} label={c || "Tümü"} onClick={() => { setCategory(c); setPage(1); }}
                  icon={c ? <Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: on ? "#fff" : color, ml: "10px !important" }} /> : undefined}
                  sx={{ bgcolor: on ? color : alpha(color, 0.1), color: on ? "#fff" : color, transition: "all .2s",
                    boxShadow: on ? `0 6px 14px ${alpha(color, 0.35)}` : "none", "&:hover": { bgcolor: on ? color : alpha(color, 0.18) } }} />
              );
            })}
          </Stack>
        </Stack>
      </Card>

      {list.loading && !list.data ? <LoadingState rows={6} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
        !list.data?.items.length ? (
          <Card>
            <EmptyState icon={<FolderSharedRoundedIcon />} color={palette.blue} title={search || category ? "Sonuç bulunamadı" : "Henüz kayıt eklemediniz"}
              description={search || category ? "Filtreleri değiştirerek tekrar deneyin." : "Tahlil sonuçlarınızı veya ölçümlerinizi ekleyerek sağlık geçmişinizi oluşturun."}
              action={!search && !category && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setDialogOpen(true)}>İlk kaydı ekle</Button>} />
          </Card>
        ) : (
          <Stack spacing={1.5} sx={{ opacity: list.loading ? 0.6 : 1, transition: "opacity .2s" }}>
            {list.data.items.map((r) => {
              const color = colorFor(r.category);
              const d = new Date(`${r.record_date}T00:00:00`);
              return (
                <Accordion key={r.id} disableGutters sx={{ borderRadius: "20px !important", border: 1, borderColor: "divider", overflow: "hidden",
                  "&::before": { display: "none" }, transition: "box-shadow .25s", "&:hover": { boxShadow: `0 10px 30px ${alpha(color, 0.15)}` },
                  borderLeft: `4px solid ${color}` }}>
                  <AccordionSummary expandIcon={<ExpandMoreRoundedIcon />} sx={{ px: 2, py: 0.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center" flex={1} mr={1} minWidth={0}>
                      <Box sx={{ textAlign: "center", minWidth: 56, py: 0.75, borderRadius: 3, bgcolor: alpha(color, 0.1), color }}>
                        <Typography fontWeight={800} fontSize={20} lineHeight={1}>{d.getDate()}</Typography>
                        <Typography variant="caption" fontWeight={700}>{d.toLocaleDateString("tr-TR", { month: "short" })} {String(d.getFullYear()).slice(2)}</Typography>
                      </Box>
                      <IconTile icon={iconFor(r.category)} color={color} size={40} />
                      <Box flex={1} minWidth={0}>
                        <Typography fontWeight={800} noWrap>{r.title}</Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>{r.category} · {r.source} · {r.measurements.length} ölçüm</Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ display: { xs: "none", sm: "flex" } }}>
                        {r.is_demo && <DemoChip />}
                        {r.document_id && <Chip size="small" icon={<DescriptionRoundedIcon />} label="Rapordan" sx={{ bgcolor: alpha(palette.amber, 0.12), color: palette.amber, "& .MuiChip-icon": { color: "inherit" } }} />}
                        {r.abnormal_count > 0
                          ? <Chip size="small" label={`${r.abnormal_count} referans dışı`} sx={{ bgcolor: alpha(palette.coral, 0.12), color: palette.coral }} />
                          : r.measurements.length > 0 && <Chip size="small" label="Tümü normal" sx={{ bgcolor: alpha(palette.green, 0.12), color: palette.green }} />}
                      </Stack>
                    </Stack>
                  </AccordionSummary>
                  <AccordionDetails sx={{ pt: 0, px: 2.5, pb: 2.5 }}>
                    {r.notes && <Typography variant="body2" color="text.secondary" mb={1.5}>{r.notes}</Typography>}
                    <Grid container spacing={1.5}>
                      {r.measurements.map((m) => (
                        <Grid key={m.id} size={{ xs: 12, sm: 6, lg: 4 }}>
                          <Box sx={{ p: 1.75, borderRadius: 3.5, bgcolor: (t) => alpha(t.palette.text.primary, 0.03), border: 1, borderColor: "divider", height: "100%" }}>
                            <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={1}>
                              <Typography fontWeight={700} fontSize={14} noWrap>{m.type_name}</Typography>
                              <Typography fontWeight={800} sx={{ color: statusMeta[m.status].color }} whiteSpace="nowrap">
                                {fmtNum(m.value)} <Typography component="span" variant="caption" color="text.secondary">{m.unit}</Typography>
                              </Typography>
                            </Stack>
                            <RangeBar value={m.value} min={m.ref_min} max={m.ref_max} status={m.status} height={5} />
                            <Typography variant="caption" color="text.secondary">Referans: {fmtRef(m.ref_min, m.ref_max)}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mt={2}>
                      <Typography variant="caption" color="text.secondary">Kayıt tarihi: {fmtDate(r.record_date)}</Typography>
                      <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" startIcon={<EditRoundedIcon />} onClick={() => { setEditing(r); setDialogOpen(true); }}>Düzenle</Button>
                        <Tooltip title="Sil"><IconButton size="small" sx={{ color: palette.coral, bgcolor: alpha(palette.coral, 0.1) }} onClick={() => setToDelete(r)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
                      </Stack>
                    </Stack>
                  </AccordionDetails>
                </Accordion>
              );
            })}
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
