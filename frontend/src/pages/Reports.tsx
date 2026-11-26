import CloudUploadOutlinedIcon from "@mui/icons-material/CloudUploadOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import ImageOutlinedIcon from "@mui/icons-material/ImageOutlined";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import FactCheckOutlinedIcon from "@mui/icons-material/FactCheckOutlined";
import {
  Alert, alpha, Box, Button, Card, Checkbox, Chip, CircularProgress, Collapse, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useRef, useState, type DragEvent } from "react";
import { api, openProtectedFile } from "../api/client";
import type { DocumentItem, ExtractionItem, Page } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  ConfirmDialog, DemoChip, EmptyState, ErrorState, errorMessage, fmtDate, LoadingState, PageHeader, Pager, today, useAsync,
} from "../components/common";

const MAX_MB = 10;
const ACCEPT = ["application/pdf", "image/png", "image/jpeg"];
const STATUS: Record<DocumentItem["status"], { label: string; color: "default" | "success" | "warning" | "error" | "info" }> = {
  uploaded: { label: "Yüklendi", color: "default" },
  extracted: { label: "Onay bekliyor", color: "warning" },
  imported: { label: "Kayıtlara aktarıldı", color: "success" },
  failed: { label: "Okunamadı", color: "error" },
};

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
      <DialogTitle>Rapor inceleme · {doc?.title}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Alert severity="warning" variant="outlined">
            Otomatik çıkarılan değerler hatalı olabilir. Lütfen her değeri raporunuzla karşılaştırın; yalnızca onayladığınız değerler kaydedilir.
          </Alert>
          {error && <Alert severity="error">{error}</Alert>}
          {ex?.message && <Alert severity="info">{ex.message}</Alert>}
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
            <TextField type="date" label="Tahlil tarihi" value={date} onChange={(e) => setDate(e.target.value)} sx={{ maxWidth: 220 }}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
            <Typography variant="body2" color="text.secondary">
              Yöntem: {ex?.method === "pdf_text" ? "PDF metin çıkarma" : ex?.method === "ocr" ? "OCR (görsel)" : "—"}
              {ex?.confirmed_at && ` · ${fmtDate(ex.confirmed_at)} tarihinde aktarıldı`}
            </Typography>
          </Stack>
          {items.length ? (
            <TableContainer sx={{ border: 1, borderColor: "divider", borderRadius: 2 }}>
              <Table size="small">
                <TableHead><TableRow><TableCell padding="checkbox" /><TableCell>Ölçüm</TableCell><TableCell>Değer</TableCell>
                  <TableCell>Birim</TableCell><TableCell>Referans</TableCell><TableCell>Rapordaki satır</TableCell></TableRow></TableHead>
                <TableBody>
                  {items.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell padding="checkbox"><Checkbox checked={i.checked} onChange={(e) => patch(idx, { checked: e.target.checked })} /></TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{i.type_name}</TableCell>
                      <TableCell sx={{ width: 110 }}><TextField value={i.valueText} onChange={(e) => patch(idx, { valueText: e.target.value })} /></TableCell>
                      <TableCell>{i.unit}</TableCell>
                      <TableCell>{i.ref_min ?? "—"} – {i.ref_max ?? "—"}</TableCell>
                      <TableCell><Typography variant="caption" fontFamily="monospace" color="text.secondary">{i.label}</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          ) : <EmptyState title="Tanınan ölçüm bulunamadı" description="Değerleri 'Sağlık Verilerim' sayfasından manuel olarak ekleyebilirsiniz." />}
          {ex?.raw_text && (
            <Box>
              <Button size="small" onClick={() => setShowText(!showText)}>{showText ? "Çıkarılan metni gizle" : "Çıkarılan metni göster"}</Button>
              <Collapse in={showText}>
                <Box component="pre" sx={{ p: 2, mt: 1, borderRadius: 2, bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
                  fontSize: 12, maxHeight: 260, overflow: "auto", whiteSpace: "pre-wrap" }}>{ex.raw_text}</Box>
              </Collapse>
            </Box>
          )}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Kapat</Button>
        <Button variant="contained" onClick={confirm} disabled={busy || !selected.length}>
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

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    upload(e.dataTransfer.files[0]);
  };

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
      <PageHeader title="Raporlarım" subtitle="Tahlil raporlarınızı yükleyin; değerleri kontrol edip onayladıktan sonra kayıtlarınıza aktarın." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 4 }}>
          <Card sx={{ p: 2.5 }}>
            <Typography variant="h6" mb={2}>Yeni rapor yükle</Typography>
            <TextField label="Rapor başlığı (isteğe bağlı)" value={title} onChange={(e) => setTitle(e.target.value)} slotProps={{ htmlInput: { maxLength: 150 } }} />
            <Box onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              onClick={() => input.current?.click()}
              sx={{ mt: 2, p: 4, textAlign: "center", borderRadius: 3, cursor: "pointer", border: "2px dashed",
                borderColor: drag ? "primary.main" : "divider", transition: "all .2s",
                bgcolor: (t) => alpha(t.palette.primary.main, drag ? 0.08 : 0.03), "&:hover": { borderColor: "primary.main" } }}>
              <CloudUploadOutlinedIcon color="primary" sx={{ fontSize: 44 }} />
              <Typography fontWeight={700} mt={1}>Dosyayı sürükleyin veya seçin</Typography>
              <Typography variant="body2" color="text.secondary">PDF, PNG, JPEG · en fazla {MAX_MB} MB</Typography>
              <input ref={input} type="file" hidden accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => upload(e.target.files?.[0])} />
            </Box>
            {uploading && <LinearProgress sx={{ mt: 2, borderRadius: 2 }} />}
            <Typography variant="caption" color="text.secondary" display="block" mt={2}>
              PDF'lerden metin otomatik çıkarılır; görsellerde OCR kullanılır. CT, MR gibi tıbbi görüntüler analiz edilmez.
            </Typography>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, lg: 8 }}>
          {list.loading && !list.data ? <LoadingState rows={4} /> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
            !list.data?.items.length ? (
              <Card><EmptyState icon={<DescriptionOutlinedIcon fontSize="large" />} title="Henüz rapor yüklemediniz"
                description="Laboratuvar sonuç PDF'inizi yükleyerek değerleri hızlıca kayıtlarınıza aktarabilirsiniz." /></Card>
            ) : (
              <Stack spacing={1.25}>
                {list.data.items.map((d) => (
                  <Card key={d.id} sx={{ p: 2 }}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems={{ sm: "center" }}>
                      <Box sx={{ width: 48, height: 48, borderRadius: 2.5, display: "grid", placeItems: "center", flexShrink: 0,
                        bgcolor: (t) => alpha(t.palette.primary.main, 0.1), color: "primary.main" }}>
                        {d.content_type === "application/pdf" ? <DescriptionOutlinedIcon /> : <ImageOutlinedIcon />}
                      </Box>
                      <Box flex={1} minWidth={0}>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Typography fontWeight={700} noWrap>{d.title}</Typography>
                          {d.is_demo && <DemoChip />}
                        </Stack>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {d.original_name} · {(d.size_bytes / 1024).toFixed(1)} KB · {fmtDate(d.uploaded_at)} · {d.extraction?.items.length ?? 0} değer bulundu
                        </Typography>
                      </Box>
                      <Chip size="small" label={STATUS[d.status].label} color={STATUS[d.status].color} variant="outlined" />
                      <Stack direction="row">
                        <Tooltip title="İncele / aktar"><IconButton color="primary" onClick={() => setReview(d)}><FactCheckOutlinedIcon /></IconButton></Tooltip>
                        <Tooltip title="Dosyayı aç"><IconButton onClick={() => openProtectedFile(`/documents/${d.id}/file`).catch((e) => notify(errorMessage(e), "error"))}><OpenInNewIcon /></IconButton></Tooltip>
                        <Tooltip title="Sil"><IconButton color="error" onClick={() => setToDelete(d)}><DeleteOutlineIcon /></IconButton></Tooltip>
                      </Stack>
                    </Stack>
                  </Card>
                ))}
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
