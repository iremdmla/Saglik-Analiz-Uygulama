import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import {
  Alert, Autocomplete, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton,
  MenuItem, Stack, TextField, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useState } from "react";
import { api } from "../api/client";
import type { HealthRecord, Measurement, MeasurementInput, MeasurementType } from "../api/types";
import { errorMessage, today } from "./common";

let typeCache: MeasurementType[] | null = null;

export function useMeasurementTypes() {
  const [types, setTypes] = useState<MeasurementType[]>(typeCache ?? []);
  useEffect(() => {
    if (!typeCache) api<MeasurementType[]>("/measurements/types").then((t) => setTypes((typeCache = t))).catch(() => {});
  }, []);
  return types;
}

export const CATEGORIES = ["Hemogram", "Biyokimya", "Vitamin ve Mineral", "Tiroid", "Laboratuvar", "Vital Bulgular", "Yaşam Tarzı", "Diğer"];
const SOURCES = ["Manuel giriş", "Laboratuvar", "Ev tipi cihaz", "Akıllı saat / tartı", "Hastane", "Diğer"];

type Row = { type: MeasurementType | null; value: string; unit: string; ref_min: string; ref_max: string };
const emptyRow = (): Row => ({ type: null, value: "", unit: "", ref_min: "", ref_max: "" });
const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(",", ".")));

function TypePicker({ types, value, onChange }: { types: MeasurementType[]; value: MeasurementType | null; onChange: (t: MeasurementType | null) => void }) {
  return (
    <Autocomplete options={types} value={value} onChange={(_, t) => onChange(t)} groupBy={(t) => t.category}
      getOptionLabel={(t) => `${t.name} (${t.unit})`} isOptionEqualToValue={(a, b) => a.id === b.id}
      renderInput={(p) => <TextField {...p} label="Ölçüm" required size="small" />} />
  );
}

function rowToInput(r: Row, date: string): MeasurementInput {
  return { type_id: r.type!.id, value: Number(r.value.replace(",", ".")), unit: r.unit || r.type!.unit, measured_at: date,
           ref_min: num(r.ref_min), ref_max: num(r.ref_max) };
}

function validRow(r: Row) {
  const v = Number(r.value.replace(",", "."));
  return r.type && r.value.trim() !== "" && !Number.isNaN(v) && v >= 0;
}

/** Sağlık kaydı (birden fazla ölçüm içeren) oluşturma/düzenleme penceresi. */
export function RecordDialog({ open, record, onClose, onSaved }: {
  open: boolean; record: HealthRecord | null; onClose: () => void; onSaved: () => void;
}) {
  const types = useMeasurementTypes();
  const theme = useTheme();
  const fullScreen = useMediaQuery(theme.breakpoints.down("sm"));
  const [head, setHead] = useState({ title: "", category: "Laboratuvar", record_date: today(), source: "Manuel giriş", notes: "" });
  const [rows, setRows] = useState<Row[]>([emptyRow()]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    if (record) {
      setHead({ title: record.title, category: record.category, record_date: record.record_date, source: record.source, notes: record.notes ?? "" });
      setRows(record.measurements.map((m) => ({
        type: types.find((t) => t.id === m.type_id) ?? null, value: String(m.value), unit: m.unit,
        ref_min: m.ref_min?.toString() ?? "", ref_max: m.ref_max?.toString() ?? "" })));
    } else {
      setHead({ title: "", category: "Laboratuvar", record_date: today(), source: "Manuel giriş", notes: "" });
      setRows([emptyRow()]);
    }
  }, [open, record, types]);

  const setRow = (i: number, patch: Partial<Row>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const save = async () => {
    if (head.title.trim().length < 2) return setError("Kayıt başlığı en az 2 karakter olmalı.");
    if (head.record_date > today()) return setError("Kayıt tarihi gelecekte olamaz.");
    const filled = rows.filter((r) => r.type || r.value);
    if (filled.some((r) => !validRow(r))) return setError("Her satırda ölçüm türü ve geçerli bir değer olmalı.");
    setBusy(true);
    setError("");
    const body = { ...head, notes: head.notes || null, measurements: filled.map((r) => rowToInput(r, head.record_date)) };
    try {
      await api(record ? `/records/${record.id}` : "/records", { method: record ? "PUT" : "POST", body });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth fullScreen={fullScreen}>
      <DialogTitle>{record ? "Sağlık kaydını düzenle" : "Yeni sağlık kaydı"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Başlık" required value={head.title} placeholder="Ör. Hemogram – Mart 2026"
                onChange={(e) => setHead({ ...head, title: e.target.value })} slotProps={{ htmlInput: { maxLength: 150 } }} />
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField select label="Kategori" value={head.category} onChange={(e) => setHead({ ...head, category: e.target.value })}>
                {CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 6, sm: 3 }}>
              <TextField type="date" label="Tarih" required value={head.record_date}
                onChange={(e) => setHead({ ...head, record_date: e.target.value })}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField select label="Veri kaynağı" value={head.source} onChange={(e) => setHead({ ...head, source: e.target.value })}>
                {[...new Set([...SOURCES, head.source])].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
              </TextField>
            </Grid>
            <Grid size={{ xs: 12, sm: 6 }}>
              <TextField label="Açıklama" value={head.notes} onChange={(e) => setHead({ ...head, notes: e.target.value })} slotProps={{ htmlInput: { maxLength: 2000 } }} />
            </Grid>
          </Grid>
          <Typography variant="subtitle2" pt={1}>Ölçümler</Typography>
          {rows.map((r, i) => (
            <Grid container spacing={1.5} key={i} alignItems="center">
              <Grid size={{ xs: 12, sm: 4.5 }}>
                <TypePicker types={types} value={r.type}
                  onChange={(t) => setRow(i, { type: t, unit: t?.unit ?? "", ref_min: t?.ref_min?.toString() ?? "", ref_max: t?.ref_max?.toString() ?? "" })} />
              </Grid>
              <Grid size={{ xs: 4, sm: 2 }}>
                <TextField label="Değer" required value={r.value} onChange={(e) => setRow(i, { value: e.target.value })} inputMode="decimal" />
              </Grid>
              <Grid size={{ xs: 4, sm: 1.5 }}>
                <TextField label="Birim" value={r.unit} onChange={(e) => setRow(i, { unit: e.target.value })} />
              </Grid>
              <Grid size={{ xs: 4, sm: 3 }}>
                <Stack direction="row" spacing={1}>
                  <TextField label="Ref. alt" value={r.ref_min} onChange={(e) => setRow(i, { ref_min: e.target.value })} />
                  <TextField label="Ref. üst" value={r.ref_max} onChange={(e) => setRow(i, { ref_max: e.target.value })} />
                </Stack>
              </Grid>
              <Grid size={{ xs: 12, sm: 1 }} textAlign="right">
                <IconButton aria-label="Satırı sil" onClick={() => setRows(rows.length > 1 ? rows.filter((_, j) => j !== i) : [emptyRow()])}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Grid>
            </Grid>
          ))}
          <Box><Button startIcon={<AddIcon />} onClick={() => setRows([...rows, emptyRow()])}>Ölçüm satırı ekle</Button></Box>
          <Typography variant="caption" color="text.secondary">
            Referans aralığı laboratuvar raporunuzdaki değerlerle değiştirilebilir. Boş bırakılırsa genel erişkin aralığı kullanılır.
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" onClick={save} disabled={busy}>{busy ? <CircularProgress size={18} color="inherit" /> : "Kaydet"}</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Tek ölçüm ekleme/düzenleme penceresi. */
export function MeasurementDialog({ open, measurement, defaultTypeId, onClose, onSaved }: {
  open: boolean; measurement: Measurement | null; defaultTypeId?: number | null; onClose: () => void; onSaved: () => void;
}) {
  const types = useMeasurementTypes();
  const [row, setRow] = useState<Row>(emptyRow());
  const [date, setDate] = useState(today());
  const [source, setSource] = useState("Manuel giriş");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError("");
    const m = measurement;
    const t = types.find((x) => x.id === (m?.type_id ?? defaultTypeId)) ?? null;
    setRow(m ? { type: t, value: String(m.value), unit: m.unit, ref_min: m.ref_min?.toString() ?? "", ref_max: m.ref_max?.toString() ?? "" }
      : { type: t, value: "", unit: t?.unit ?? "", ref_min: t?.ref_min?.toString() ?? "", ref_max: t?.ref_max?.toString() ?? "" });
    setDate(m?.measured_at ?? today());
    setSource(m?.source ?? "Manuel giriş");
    setNote(m?.note ?? "");
  }, [open, measurement, defaultTypeId, types]);

  const save = async () => {
    if (!validRow(row)) return setError("Ölçüm türü ve geçerli bir değer girin.");
    if (date > today()) return setError("Ölçüm tarihi gelecekte olamaz.");
    setBusy(true);
    try {
      await api(measurement ? `/measurements/${measurement.id}` : "/measurements", {
        method: measurement ? "PUT" : "POST", body: { ...rowToInput(row, date), source, note: note || null } });
      onSaved();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{measurement ? "Ölçümü düzenle" : "Yeni ölçüm"}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}
          <TypePicker types={types} value={row.type}
            onChange={(t) => setRow({ ...row, type: t, unit: t?.unit ?? "", ref_min: t?.ref_min?.toString() ?? "", ref_max: t?.ref_max?.toString() ?? "" })} />
          <Stack direction="row" spacing={1.5}>
            <TextField label="Değer" required value={row.value} onChange={(e) => setRow({ ...row, value: e.target.value })} />
            <TextField label="Birim" value={row.unit} onChange={(e) => setRow({ ...row, unit: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField label="Referans alt" value={row.ref_min} onChange={(e) => setRow({ ...row, ref_min: e.target.value })} />
            <TextField label="Referans üst" value={row.ref_max} onChange={(e) => setRow({ ...row, ref_max: e.target.value })} />
          </Stack>
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" label="Ölçüm tarihi" value={date} onChange={(e) => setDate(e.target.value)}
              slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
            <TextField select label="Kaynak" value={source} onChange={(e) => setSource(e.target.value)}>
              {[...new Set([...SOURCES, source])].map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
            </TextField>
          </Stack>
          <TextField label="Açıklama" value={note} onChange={(e) => setNote(e.target.value)} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose}>Vazgeç</Button>
        <Button variant="contained" onClick={save} disabled={busy}>{busy ? <CircularProgress size={18} color="inherit" /> : "Kaydet"}</Button>
      </DialogActions>
    </Dialog>
  );
}
