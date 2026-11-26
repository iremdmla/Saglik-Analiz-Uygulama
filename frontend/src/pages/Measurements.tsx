import AddIcon from "@mui/icons-material/Add";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import MonitorHeartOutlinedIcon from "@mui/icons-material/MonitorHeartOutlined";
import {
  alpha, Box, Button, Card, IconButton, List, ListItemButton, ListItemText, ListSubheader, MenuItem, Stack, Tab, Table,
  TableBody, TableCell, TableContainer, TableHead, TableRow, Tabs, TextField, Tooltip, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import type { AnalysisResult, Measurement, Page } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  ConfirmDialog, DemoChip, EmptyState, ErrorState, errorMessage, fmtDate, fmtRef, LoadingState, PageHeader, Pager,
  SectionCard, StatusChip, useAsync,
} from "../components/common";
import { MeasurementDialog, useMeasurementTypes } from "../components/MeasurementDialogs";
import TrendChart from "../components/TrendChart";
import { statusMeta } from "../theme";
import { TrendIcon } from "./Dashboard";

type CompareRow = {
  type_id: number; name: string; category: string; comparable: boolean; change: number | null; change_pct: number | null;
  note?: string; a?: Measurement; b?: Measurement;
};

function useMeasurementActions(onDone: () => void) {
  const notify = useNotify();
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Measurement | null>(null);
  const [busy, setBusy] = useState(false);
  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api(`/measurements/${toDelete.id}`, { method: "DELETE" });
      notify("Ölçüm silindi.");
      setToDelete(null);
      onDone();
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };
  return { editing, setEditing, open, setOpen, toDelete, setToDelete, busy, remove, notify };
}

function RowActions({ m, onEdit, onDelete }: { m: Measurement; onEdit: (m: Measurement) => void; onDelete: (m: Measurement) => void }) {
  return (
    <Stack direction="row" justifyContent="flex-end">
      <Tooltip title="Düzenle"><IconButton size="small" onClick={() => onEdit(m)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Sil"><IconButton size="small" color="error" onClick={() => onDelete(m)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  );
}

function IndicatorsTab({ onEdit, onDelete, version }: { onEdit: (m: Measurement) => void; onDelete: (m: Measurement) => void; version: number }) {
  const analysis = useAsync(() => api<AnalysisResult>("/analysis/overview"), [version]);
  const [selected, setSelected] = useState<number | null>(null);
  const items = analysis.data?.items ?? [];
  const typeId = selected ?? items[0]?.type_id ?? null;
  const history = useAsync(() => (typeId ? api<Measurement[]>(`/measurements/history/${typeId}`) : Promise.resolve([])), [typeId, version]);
  const [histPage, setHistPage] = useState(1);

  if (analysis.loading && !analysis.data) return <LoadingState rows={6} />;
  if (analysis.error) return <ErrorState message={analysis.error} onRetry={analysis.reload} />;
  if (!items.length) return <Card><EmptyState icon={<MonitorHeartOutlinedIcon fontSize="large" />} title="Henüz ölçüm yok" description="Ölçüm ekleyerek değişim grafiklerinizi oluşturun." /></Card>;

  const categories = [...new Set([...items].sort((a, b) => a.category.localeCompare(b.category, "tr")).map((i) => i.category))];
  const h = history.data ?? [];
  const sameUnit = h.filter((x) => x.unit === h[h.length - 1]?.unit).map((x) => x.value);
  const stats = sameUnit.length ? { min: Math.min(...sameUnit), max: Math.max(...sameUnit),
    avg: +(sameUnit.reduce((a, b) => a + b, 0) / sameUnit.length).toFixed(2) } : null;
  const current = items.find((i) => i.type_id === typeId);
  const sorted = [...h].reverse();
  const pageRows = sorted.slice((histPage - 1) * 6, histPage * 6);

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 4, lg: 3.5 }}>
        <Card sx={{ maxHeight: { md: 720 }, overflow: "auto" }}>
          <List dense disablePadding>
            {categories.map((c) => (
              <li key={c}>
                <ul style={{ padding: 0 }}>
                  <ListSubheader sx={{ fontWeight: 700, lineHeight: "36px" }}>{c}</ListSubheader>
                  {items.filter((i) => i.category === c).map((i) => (
                    <ListItemButton key={i.type_id} selected={i.type_id === typeId} onClick={() => { setSelected(i.type_id); setHistPage(1); }}
                      sx={{ mx: 1, mb: 0.25 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusMeta[i.status].color, mr: 1.5, flexShrink: 0 }} />
                      <ListItemText primary={i.name} primaryTypographyProps={{ fontWeight: 600, noWrap: true }}
                        secondary={`${i.latest_value} ${i.unit}`} />
                      <TrendIcon item={i} />
                    </ListItemButton>
                  ))}
                </ul>
              </li>
            ))}
          </List>
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8, lg: 8.5 }}>
        <Stack spacing={2}>
          <SectionCard title={current?.name} action={current && <StatusChip status={current.status} />}>
            {history.loading && !history.data ? <LoadingState rows={3} /> : (
              <>
                {current && (
                  <Grid container spacing={2} mb={1}>
                    {[["Son değer", `${current.latest_value} ${current.unit}`], ["Referans", fmtRef(current.ref_min, current.ref_max)],
                      ["En düşük / en yüksek", stats ? `${stats.min} / ${stats.max}` : "—"], ["Ortalama", stats?.avg ?? "—"]].map(([k, v]) => (
                      <Grid key={k as string} size={{ xs: 6, sm: 3 }}>
                        <Typography variant="caption" color="text.secondary">{k}</Typography>
                        <Typography fontWeight={700}>{v}</Typography>
                      </Grid>
                    ))}
                  </Grid>
                )}
                <TrendChart data={h} height={300} />
                {current?.notes.map((n) => <Typography key={n} variant="caption" color="text.secondary" display="block">• {n}</Typography>)}
              </>
            )}
          </SectionCard>
          <SectionCard title="Geçmiş ölçümler" pad={false}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Tarih</TableCell><TableCell align="right">Değer</TableCell><TableCell>Kaynak</TableCell><TableCell>Durum</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {pageRows.map((m, idx) => {
                    const prev = sorted[(histPage - 1) * 6 + idx + 1];
                    const diff = prev && prev.unit === m.unit ? +(m.value - prev.value).toFixed(2) : null;
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell>{fmtDate(m.measured_at)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={700} component="span">{m.value} </Typography>
                          <Typography variant="caption" color="text.secondary">{m.unit}</Typography>
                          {diff !== null && diff !== 0 && <Typography variant="caption" display="block" color="text.secondary">{diff > 0 ? "+" : ""}{diff}</Typography>}
                        </TableCell>
                        <TableCell><Stack direction="row" spacing={1} alignItems="center"><span>{m.source}</span>{m.is_demo && <DemoChip />}</Stack></TableCell>
                        <TableCell><StatusChip status={m.status} /></TableCell>
                        <TableCell><RowActions m={m} onEdit={onEdit} onDelete={onDelete} /></TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
            <Box px={2} pb={2}><Pager page={histPage} pageSize={6} total={sorted.length} onChange={setHistPage} /></Box>
          </SectionCard>
        </Stack>
      </Grid>
    </Grid>
  );
}

function AllTab({ onEdit, onDelete, version }: { onEdit: (m: Measurement) => void; onDelete: (m: Measurement) => void; version: number }) {
  const types = useMeasurementTypes();
  const [page, setPage] = useState(1);
  const [typeId, setTypeId] = useState("");
  const [status, setStatus] = useState("");
  const list = useAsync(() => api<Page<Measurement>>("/measurements", { query: { page, page_size: 12, type_id: typeId, status } }),
    [page, typeId, status, version]);
  return (
    <Card>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} p={2}>
        <TextField select label="Ölçüm türü" value={typeId} onChange={(e) => { setTypeId(e.target.value); setPage(1); }}>
          <MenuItem value="">Tümü</MenuItem>
          {types.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
        </TextField>
        <TextField select label="Durum" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <MenuItem value="">Tümü</MenuItem>
          <MenuItem value="normal">Normal</MenuItem>
          <MenuItem value="abnormal">Referans dışı</MenuItem>
          <MenuItem value="low">Düşük</MenuItem>
          <MenuItem value="high">Yüksek</MenuItem>
        </TextField>
      </Stack>
      {list.loading && !list.data ? <Box p={2}><LoadingState /></Box> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
        !list.data?.items.length ? <EmptyState title="Ölçüm bulunamadı" /> : (
          <Box sx={{ opacity: list.loading ? 0.6 : 1 }}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Tarih</TableCell><TableCell>Ölçüm</TableCell><TableCell>Kategori</TableCell><TableCell align="right">Değer</TableCell>
                  <TableCell>Referans</TableCell><TableCell>Durum</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {list.data.items.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>{fmtDate(m.measured_at)}</TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{m.type_name}</TableCell>
                      <TableCell>{m.category}</TableCell>
                      <TableCell align="right"><b>{m.value}</b> <Typography variant="caption" color="text.secondary">{m.unit}</Typography></TableCell>
                      <TableCell>{fmtRef(m.ref_min, m.ref_max)}</TableCell>
                      <TableCell><StatusChip status={m.status} /></TableCell>
                      <TableCell><RowActions m={m} onEdit={onEdit} onDelete={onDelete} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box px={2} pb={2}><Pager page={page} pageSize={12} total={list.data.total} onChange={setPage} /></Box>
          </Box>
        )}
    </Card>
  );
}

function CompareTab() {
  const dates = useAsync(() => api<string[]>("/measurements/dates"), []);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  const da = a || dates.data?.[Math.min(dates.data.length - 1, 3)] || "";
  const db = b || dates.data?.[0] || "";
  const cmp = useAsync(() => (da && db ? api<CompareRow[]>("/measurements/compare", { query: { date_a: da, date_b: db } }) : Promise.resolve([])), [da, db]);
  const rows = (cmp.data ?? []).filter((r) => r.a && r.b);
  return (
    <Card>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} p={2} alignItems="center">
        <TextField select label="Eski ölçüm tarihi" value={da} onChange={(e) => setA(e.target.value)}>
          {(dates.data ?? []).map((d) => <MenuItem key={d} value={d}>{fmtDate(d)}</MenuItem>)}
        </TextField>
        <CompareArrowsIcon color="action" />
        <TextField select label="Yeni ölçüm tarihi" value={db} onChange={(e) => setB(e.target.value)}>
          {(dates.data ?? []).map((d) => <MenuItem key={d} value={d}>{fmtDate(d)}</MenuItem>)}
        </TextField>
      </Stack>
      {cmp.loading ? <Box p={2}><LoadingState /></Box> : !rows.length ? (
        <EmptyState icon={<CompareArrowsIcon fontSize="large" />} title="Karşılaştırılacak ortak ölçüm yok"
          description="Seçilen iki tarihte aynı ölçüm türünden değer bulunmalı. Laboratuvar tarihlerini seçmeyi deneyin." />
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead><TableRow><TableCell>Ölçüm</TableCell><TableCell align="right">{fmtDate(da)}</TableCell>
              <TableCell align="right">{fmtDate(db)}</TableCell><TableCell align="right">Değişim</TableCell><TableCell>Yeni durum</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.type_id} hover>
                  <TableCell><Typography fontWeight={600}>{r.name}</Typography><Typography variant="caption" color="text.secondary">{r.category}</Typography></TableCell>
                  <TableCell align="right">{r.a!.value} <Typography variant="caption" color="text.secondary">{r.a!.unit}</Typography></TableCell>
                  <TableCell align="right"><b>{r.b!.value}</b> <Typography variant="caption" color="text.secondary">{r.b!.unit}</Typography></TableCell>
                  <TableCell align="right">
                    {r.comparable ? (
                      <Box component="span" sx={{ px: 1, py: 0.25, borderRadius: 1.5, fontWeight: 700, fontSize: 13,
                        bgcolor: (t) => alpha(t.palette.text.primary, 0.06) }}>
                        {r.change! > 0 ? "+" : ""}{r.change} ({r.change_pct ?? 0}%)
                      </Box>
                    ) : <Typography variant="caption" color="warning.main">{r.note}</Typography>}
                  </TableCell>
                  <TableCell><StatusChip status={r.b!.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Card>
  );
}

export default function Measurements() {
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState(0);
  const [version, setVersion] = useState(0);
  const act = useMeasurementActions(() => setVersion((v) => v + 1));
  const dialogOpen = act.open || params.get("new") === "1";
  const close = () => { act.setOpen(false); act.setEditing(null); if (params.get("new")) setParams({}, { replace: true }); };
  const onEdit = (m: Measurement) => { act.setEditing(m); act.setOpen(true); };

  return (
    <>
      <PageHeader title="Ölçümlerim" subtitle="Göstergelerinizin zaman içindeki değişimini izleyin ve karşılaştırın."
        action={<Button variant="contained" startIcon={<AddIcon />} onClick={() => act.setOpen(true)}>Ölçüm ekle</Button>} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }} variant="scrollable" allowScrollButtonsMobile>
        <Tab label="Göstergeler ve grafik" />
        <Tab label="Tüm ölçümler" />
        <Tab label="Karşılaştırma" />
      </Tabs>
      {tab === 0 && <IndicatorsTab onEdit={onEdit} onDelete={act.setToDelete} version={version} />}
      {tab === 1 && <AllTab onEdit={onEdit} onDelete={act.setToDelete} version={version} />}
      {tab === 2 && <CompareTab />}
      <MeasurementDialog open={dialogOpen} measurement={act.editing} onClose={close}
        onSaved={() => { act.notify(act.editing ? "Ölçüm güncellendi." : "Ölçüm eklendi."); close(); setVersion((v) => v + 1); }} />
      <ConfirmDialog open={!!act.toDelete} title="Ölçümü sil" busy={act.busy} onCancel={() => act.setToDelete(null)} onConfirm={act.remove}
        message={`${act.toDelete?.type_name} (${act.toDelete?.value} ${act.toDelete?.unit}, ${fmtDate(act.toDelete?.measured_at)}) silinecek.`} />
    </>
  );
}
