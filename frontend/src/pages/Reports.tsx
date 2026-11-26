import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FactCheckRoundedIcon from "@mui/icons-material/FactCheckRounded";
import ImageRoundedIcon from "@mui/icons-material/ImageRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";
import PlaylistAddCheckRoundedIcon from "@mui/icons-material/PlaylistAddCheckRounded";
import {
  Alert, alpha, Box, Button, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent,
  IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip,
  Typography, useMediaQuery, useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { api, openProtectedFile } from "../api/client";
import type { DocumentItem, ExtractionItem, Page } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  ConfirmDialog, DemoChip, DialogHeader, EmptyState, ErrorState, errorMessage, fmtDate, fmtRef, IconTile, LoadingState, PageHeader, Pager,
  today, useAsync,
} from "../components/common";
import { palette } from "../theme";

const MAX_MB = 10;
const ACCEPT = ["application/pdf", "image/png", "image/jpeg"];
const STATUS: Record<DocumentItem["status"], { label: string; color: string }> = {
  uploaded: { label: "Yüklendi", color: palette.slate },
  extracted: { label: "Onay bekliyor", color: palette.amber },
  imported: { label: "Kayıtlara aktarıldı", color: palette.green },
  failed: { label: "Okunamadı", color: palette.coral },
};
const STEPS = [
  { icon: <CloudUploadRoundedIcon />, title: "Yükle", text: "PDF veya görsel", color: palette.amber },
  { icon: <FactCheckRoundedIcon />, title: "Kontrol et", text: "Çıkarılan değerler", color: palette.blue },
  { icon: <PlaylistAddCheckRoundedIcon />, title: "Onayla", text: "Kayıtlara aktar", color: palette.green },
];

type EditItem = ExtractionItem & { checked: boolean; valueText: string };

function ReviewDialog({ doc, onClose, onImported }: { doc: DocumentItem | null; onClose: () => void; onImported: () => void }) {
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [items, setItems] = useState<EditItem[]>([]);
  const [date, setDate] = useState(today());
  const [showText, setShowText] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const ex = doc?.extraction;

  useEffect(() => {
    if (!doc) return;
    setItems((doc.extraction?.items ?? []).map((i) => ({ ...i, checked: true, valueText: String(i.value) })));
    setDate(doc.uploaded_at.slice(0, 10) > today() ? today() : doc.uploaded_at.slice(0, 10));
    setError("");
    setShowText(false);
  }, [doc]);

  const patch = (idx: number, p: Partial<EditItem>) => setItems(items.map((x, i) => (i === idx ? { ...x, ...p } : x)));
  const selected = items.filter((i) => i.checked && i.type_id);

  const confirm = async () => {
    if (!doc || !selected.length) return;
    if (selected.some((i) => Number.isNaN(Number(i.valueText.replace(",", "."))))) return setError("Geçersiz değer var.");
    setBusy(true);
    try {
      await api(`/documents/${doc.id}/import`, { method: "POST", body: {
        record_date: date, title: doc.title,
        items: selected.map((i) => ({ type_id: i.type_id, value: Number(i.valueText.replace(",", ".")), unit: i.unit,
          ref_min: i.ref_min, ref_max: i.ref_max, measured_at: date })),
      } });
      onImported();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!doc} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogHeader icon={<FactCheckRoundedIcon />} color={palette.amber} title={`Rapor inceleme · ${doc?.title ?? ""}`}
        subtitle={ex?.method === "pdf_text" ? "PDF metninden çıkarılan değerler" : ex?.method === "ocr" ? "Görselden OCR ile okunan değerler" : "Çıkarım sonucu"} />
      <DialogContent>
        <Stack spacing={2} pt={2.5}>
          <Alert severity="warning" variant="outlined">
            Otomatik çıkarılan değerler hatalı olabilir. Her değeri raporunuzla karşılaştırın; yalnızca onayladığınız değerler kaydedilir.
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {ex?.message && <Alert severity="info">{ex.message}</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField type="date" label="Tahlil tarihi" value={date} onChange={(e) => setDate(e.target.value)} sx={{ maxWidth: 220 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
            {ex?.confirmed_at && <Chip icon={<CheckCircleRoundedIcon />} label={`${fmtDate(ex.confirmed_at)} tarihinde aktarıldı`}
              sx={{ bgcolor: alpha(palette.green, 0.12), color: palette.green, "& .MuiChip-icon": { color: "inherit" } }} />}
          </Stack>
          {items.length ? (
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 4 }}>
              <Table size="small">
                <TableHead><TableRow><TableCell padding="checkbox" /><TableCell>Ölçüm</TableCell><TableCell>Değer</TableCell>
                  <TableCell>Birim</TableCell><TableCell>Referans</TableCell><TableCell>Rapordaki satır</TableCell></TableRow></TableHead>
                <TableBody>
                  {items.map((i, idx) => (
                    <TableRow key={idx} sx={{ opacity: i.checked ? 1 : 0.5 }}>
                      <TableCell padding="checkbox"><Checkbox checked={i.checked} onChange={(e) => patch(idx, { checked: e.target.checked })} /></TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>{i.type_name}</TableCell>
                      <TableCell sx={{ width: 110 }}><TextField value={i.valueText} onChange={(e) => patch(idx, { valueText: e.target.value })} /></TableCell>
                      <TableCell>{i.unit}</TableCell>
                      <TableCell>{fmtRef(i.ref_min, i.ref_max)}</TableCell>
                      <TableCell><Typography variant="caption" fontFamily="monospace" color="text.secondary">{i.label}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : <EmptyState title="Tanınan ölçüm bulunamadı" color={palette.amber} description="Değerleri 'Sağlık Verilerim' sayfasından manuel olarak ekleyebilirsiniz." />}
          {ex?.raw_text && (
            <Box>
              <Button size="small" onClick={() => setShowText(!showText)}>{showText ? "Çıkarılan metni gizle" : "Çıkarılan metni göster"}</Button>
              <Collapse in={showText}>
                <Box component="pre" sx={{ p: 2, mt: 1, borderRadius: 3, bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                  fontSize: 12, maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}>{ex.raw_text}</Box>
              </Collapse>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2.5, borderTop: 1, borderColor: "divider" }}>
        <Button onClick={onClose}>Kapat</Button>
        <Button variant="contained" onClick={confirm} disabled={busy || !selected.length} startIcon={!busy && <PlaylistAddCheckRoundedIcon />}>
          {busy ? <CircularProgress size={18} color="inherit" /> : `Onayla ve ${selected.length} değeri aktar`}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function Reports() {
  const [page, setPage] = useState(1);
  const list = useAsync(() => api<Page<DocumentItem>>("/documents", { query: { page, page_size: 6 } }), [page]);
  const [title, setTitle] = useState("");
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [review, setReview] = useState<DocumentItem | null>(null);
  const [toDelete, setToDelete] = useState<DocumentItem | null>(null);
  const [busy, setBusy] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const notify = useNotify();

  const upload = async (file: File | undefined) => {
    if (!file) return;
    if (!ACCEPT.includes(file.type)) return notify("Yalnızca PDF, PNG veya JPEG yükleyebilirsiniz.", "error");
    if (file.size > MAX_MB * 1024 * 1024) return notify(`Dosya en fazla ${MAX_MB} MB olabilir.`, "error");
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    setUploading(true);
    try {
      const doc = await api<DocumentItem>("/documents", { method: "POST", form });
      notify("Rapor yüklendi. Çıkarılan değerleri kontrol edin.");
      setTitle("");
      setPage(1);
      list.reload();
      setReview(doc);
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files[0]); };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api(`/documents/${toDelete.id}`, { method: "DELETE" });
      notify("Rapor silindi.");
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
      <PageHeader title="Raporlarım" eyebrow="Belgeler" subtitle="Tahlil raporlarınızı yükleyin; değerleri kontrol edip onayladıktan sonra kayıtlarınıza aktarın."
        icon={<DescriptionRoundedIcon />} color={palette.amber} />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 4.5 }}>
          <Card sx={{ p: 2.75 }}>
            <Typography variant="h6">Yeni rapor yükle</Typography>
            <Stack direction="row" spacing={1} my={2}>
              {STEPS.map((s, i) => (
                <Box key={s.title} flex={1} sx={{ p: 1.25, borderRadius: 3, bgcolor: alpha(s.color, 0.08), position: "relative" }}>
                  <Stack direction="row" spacing={0.75} alignItems="center" sx={{ color: s.color, "& svg": { fontSize: 18 } }}>
                    {s.icon}<Typography fontWeight={800} fontSize={13}>{i + 1}. {s.title}</Typography>
                  </Stack>
                  <Typography variant="caption" color="text.secondary">{s.text}</Typography>
                </Box>
              ))}
            </Stack>
            <TextField label="Rapor başlığı (isteğe bağlı)" value={title} onChange={(e) => setTitle(e.target.value)} slotProps={{ htmlInput: { maxLength: 150 } }} />
            <Box onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              onClick={() => input.current?.click()} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && input.current?.click()}
              sx={{ mt: 2, p: 4, textAlign: "center", borderRadius: 5, cursor: "pointer", transition: "all .25s", position: "relative", overflow: "hidden",
                border: `2px dashed ${drag ? palette.amber : alpha(palette.amber, 0.45)}`,
                background: `radial-gradient(circle at 50% 0%, ${alpha(palette.amber, drag ? 0.2 : 0.1)}, transparent 70%)`,
                transform: drag ? "scale(1.01)" : "none", "&:hover": { borderColor: palette.amber, "& .up-ico": { transform: "translateY(-4px)" } } }}>
              <Box className="up-ico" sx={{ transition: "transform .25s", display: "inline-flex" }}>
                <IconTile icon={<CloudUploadRoundedIcon />} color={palette.amber} size={60} solid />
              </Box>
              <Typography fontWeight={800} mt={1.5}>Dosyayı sürükleyin veya seçin</Typography>
              <Typography variant="body2" color="text.secondary">PDF, PNG, JPEG · en fazla {MAX_MB} MB</Typography>
              <input ref={input} type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => upload(e.target.files?.[0])} />
            </Box>
            {uploading && <LinearProgress sx={{ mt: 2 }} color="warning" />}
            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              PDF'lerden metin otomatik çıkarılır; görsellerde OCR kullanılır. CT, MR gibi tıbbi görüntüler analiz edilmez.
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 7.5 }}>
          {list.loading && !list.data ? <LoadingState rows={4} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
            !list.data?.items.length ? (
              <Card><EmptyState icon={<DescriptionRoundedIcon />} color={palette.amber} title="Henüz rapor yüklemediniz"
                description="Laboratuvar sonuç PDF'inizi yükleyerek değerleri hızlıca kayıtlarınıza aktarabilirsiniz." /></Card>
            ) : (
              <Stack spacing={1.5}>
                {list.data.items.map((d) => {
                  const st = STATUS[d.status];
                  const pending = d.status === "extracted";
                  return (
                    <Card key={d.id} sx={{ p: 2, position: "relative", overflow: "hidden", "&:hover": { transform: "translateY(-2px)" },
                      background: (t) => `linear-gradient(100deg, ${alpha(st.color, t.palette.mode === "dark" ? 0.12 : 0.06)}, transparent 45%), ${t.palette.background.paper}` }}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                        <IconTile icon={d.content_type === "application/pdf" ? <DescriptionRoundedIcon /> : <ImageRoundedIcon />} color={st.color} size={52} solid />
                        <Box flex={1} minWidth={0}>
                          <Stack direction="row" spacing={1} alignItems="center">
                            <Typography fontWeight={800} noWrap>{d.title}</Typography>
                            {d.is_demo && <DemoChip />}
                          </Stack>
                          <Typography variant="body2" color="text.secondary" noWrap>
                            {fmtDate(d.uploaded_at)} · {(d.size_bytes / 1024).toFixed(1)} KB · {d.extraction?.items.length ?? 0} değer bulundu
                          </Typography>
                          <Chip size="small" label={st.label} sx={{ mt: 1, bgcolor: alpha(st.color, 0.14), color: st.color }} />
                        </Box>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Button size="small" variant={pending ? "contained" : "outlined"} startIcon={<FactCheckRoundedIcon />} onClick={() => setReview(d)}>
                            {pending ? "İncele ve onayla" : "İncele"}
                          </Button>
                          <Tooltip title="Dosyayı aç"><IconButton aria-label="Dosyayı aç" onClick={() => openProtectedFile(`/documents/${d.id}/file`).catch((e) => notify(errorMessage(e), "error"))}><OpenInNewRoundedIcon /></IconButton></Tooltip>
                          <Tooltip title="Sil"><IconButton aria-label="Sil" sx={{ "&:hover": { color: palette.coral } }} onClick={() => setToDelete(d)}><DeleteOutlineRoundedIcon /></IconButton></Tooltip>
                        </Stack>
                      </Stack>
                    </Card>
                  );
                })}
                <Pager page={page} pageSize={6} total={list.data.total} onChange={setPage} />
              </Stack>
            )}
        </Grid>
      </Grid>
      <ReviewDialog doc={review} onClose={() => setReview(null)}
        onImported={() => { notify("Onaylanan değerler sağlık kayıtlarınıza aktarıldı."); setReview(null); list.reload(); }} />
      <ConfirmDialog open={!!toDelete} title="Raporu sil" busy={busy} onCancel={() => setToDelete(null)} onConfirm={remove}
        message="Rapor dosyası silinecek. Daha önce aktarılan sağlık kayıtları korunur." />
    </>
  );
}
