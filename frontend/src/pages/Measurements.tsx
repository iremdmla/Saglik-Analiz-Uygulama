import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CompareArrowsRoundedIcon from "@mui/icons-material/CompareArrowsRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";
import SouthEastRoundedIcon from "@mui/icons-material/SouthEastRounded";
import {
  alpha, Box, Button, Card, Chip, IconButton, MenuItem, Stack, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tabs, TextField, Tooltip, Typography, useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip as RTooltip, XAxis, YAxis } from "recharts";
import { api } from "../api/client";
import type { AnalysisResult, Measurement, Page } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  ConfirmDialog, DemoChip, EmptyState, ErrorState, errorMessage, filterByPeriod, fmtDate, fmtNum, fmtRef, IconTile, LoadingState,
  PageHeader, Pager, PeriodFilter, RangeBar, SectionCard, Sparkline, StatusChip, useAsync, type Period,
} from "../components/common";
import { iconFor } from "../components/icons";
import { MeasurementDialog, useMeasurementTypes } from "../components/MeasurementDialogs";
import TrendChart, { axisProps, useChartTooltip } from "../components/TrendChart";
import { colorFor, palette, statusMeta } from "../theme";
import { TrendIcon } from "./Dashboard";

type CompareRow = {
  type_id: number; name: string; category: string; comparable: boolean; change: number | null; change_pct: number | null;
  note?: string; a?: Measurement; b?: Measurement;
};

function RowActions({ m, onEdit, onDelete }: { m: Measurement; onEdit: (m: Measurement) => void; onDelete: (m: Measurement) => void }) {
  return (
    <Stack direction="row" justifyContent="flex-end">
      <Tooltip title="Düzenle"><IconButton size="small" onClick={() => onEdit(m)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>
      <Tooltip title="Sil"><IconButton size="small" sx={{ "&:hover": { color: palette.coral } }} onClick={() => onDelete(m)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>
    </Stack>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <Box sx={{ p: 1.5, borderRadius: 3.5, bgcolor: alpha(color, 0.08), border: `1px solid ${alpha(color, 0.16)}`, height: "100%" }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600}>{label}</Typography>
      <Typography fontWeight={800} fontSize={18}>{value}</Typography>
    </Box>
  );
}

function IndicatorsTab({ onEdit, onDelete, version }: { onEdit: (m: Measurement) => void; onDelete: (m: Measurement) => void; version: number }) {
  const analysis = useAsync(() => api<AnalysisResult>("/analysis/overview"), [version]);
  const [selected, setSelected] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("all");
  const [histPage, setHistPage] = useState(1);
  const items = analysis.data?.items ?? [];
  const current = items.find((i) => i.type_id === selected) ?? items[0];
  const typeId = current?.type_id ?? null;
  const history = useAsync(() => (typeId ? api<Measurement[]>(`/measurements/history/${typeId}`) : Promise.resolve([])), [typeId, version]);

  if (analysis.loading && !analysis.data) return <LoadingState rows={6} />;
  if (analysis.error) return <ErrorState message={analysis.error} onRetry={analysis.reload} />;
  if (!items.length || !current) return <Card><EmptyState icon={<MonitorHeartRoundedIcon />} color={palette.pink} title="Henüz ölçüm yok" description="Ölçüm ekleyerek değişim grafiklerinizi oluşturun." /></Card>;

  const categories = [...new Set(items.map((i) => i.category))].sort((a, b) => a.localeCompare(b, "tr"));
  const h = history.data ?? [];
  const color = colorFor(current.category);
  const same = h.filter((x) => x.unit === current.unit);
  const vals = same.map((x) => x.value);
  const stats = vals.length ? { min: Math.min(...vals), max: Math.max(...vals), avg: +(vals.reduce((a, b) => a + b, 0) / vals.length).toFixed(2) } : null;
  const points = filterByPeriod(same, period, (m) => m.measured_at).map((m) => ({ date: m.measured_at, value: m.value, status: m.status }));
  const sorted = [...h].reverse();
  const pageRows = sorted.slice((histPage - 1) * 6, histPage * 6);

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, md: 4, lg: 3.5 }}>
        <Card sx={{ maxHeight: { md: 860 }, overflow: "auto", p: 1.25 }}>
          {categories.map((c) => (
            <Box key={c} mb={1}>
              <Stack direction="row" spacing={1} alignItems="center" px={1} py={1}>
                <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: colorFor(c) }} />
                <Typography variant="overline" color="text.secondary" lineHeight={1}>{c}</Typography>
              </Stack>
              {items.filter((i) => i.category === c).map((i) => {
                const active = i.type_id === current.type_id;
                const ic = colorFor(i.category);
                return (
                  <Stack key={i.type_id} direction="row" spacing={1.25} alignItems="center" onClick={() => { setSelected(i.type_id); setHistPage(1); }}
                    sx={{ p: 1, mb: 0.5, borderRadius: 3, cursor: "pointer", transition: "all .2s",
                      bgcolor: active ? alpha(ic, 0.12) : "transparent", boxShadow: active ? `inset 0 0 0 1.5px ${alpha(ic, 0.5)}` : "none",
                      "&:hover": { bgcolor: alpha(ic, 0.08) } }}>
                    <IconTile icon={iconFor(i.category, i.code)} color={ic} size={34} solid={active} />
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={700} fontSize={14} noWrap>{i.name}</Typography>
                      <Stack direction="row" spacing={0.75} alignItems="center">
                        <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: statusMeta[i.status].color }} />
                        <Typography variant="caption" color="text.secondary">{fmtNum(i.latest_value)} {i.unit}</Typography>
                      </Stack>
                    </Box>
                    <Box width={56}><Sparkline data={i.history.map((x) => x.value)} color={ic} width={56} height={24} /></Box>
                  </Stack>
                );
              })}
            </Box>
          ))}
        </Card>
      </Grid>
      <Grid size={{ xs: 12, md: 8, lg: 8.5 }}>
        <Stack spacing={2.5}>
          <SectionCard title={current.name} subtitle={`${current.category} · ${current.count} ölçüm`} icon={iconFor(current.category, current.code)} color={color}
            action={<Stack direction="row" spacing={1} alignItems="center"><TrendIcon item={current} /><StatusChip status={current.status} /></Stack>}>
            <Grid container spacing={1.5} mb={2}>
              <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="Son değer" value={`${fmtNum(current.latest_value)} ${current.unit}`} color={color} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="Referans" value={fmtRef(current.ref_min, current.ref_max)} color={palette.green} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="En düşük / yüksek" value={stats ? `${fmtNum(stats.min)} / ${fmtNum(stats.max)}` : "—"} color={palette.blue} /></Grid>
              <Grid size={{ xs: 6, sm: 3 }}><MiniStat label="Ortalama" value={stats ? fmtNum(stats.avg) : "—"} color={palette.violet} /></Grid>
            </Grid>
            <Box mb={2}><RangeBar value={current.latest_value} min={current.ref_min} max={current.ref_max} status={current.status} /></Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="subtitle2">Zaman içindeki değişim</Typography>
              <PeriodFilter value={period} onChange={setPeriod} />
            </Stack>
            {history.loading && !history.data ? <LoadingState rows={3} /> :
              <TrendChart points={points} unit={current.unit} name={current.name} refMin={current.ref_min} refMax={current.ref_max} color={color} height={300} />}
            {current.notes.map((n) => <Typography key={n} variant="caption" color="text.secondary" display="block">• {n}</Typography>)}
          </SectionCard>
          <SectionCard title="Geçmiş ölçümler" icon={<HistoryRoundedIcon />} color={palette.blue} pad={false} fill={false}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Tarih</TableCell><TableCell align="right">Değer</TableCell><TableCell>Kaynak</TableCell><TableCell>Durum</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {pageRows.map((m, idx) => {
                    const prev = sorted[(histPage - 1) * 6 + idx + 1];
                    const diff = prev && prev.unit === m.unit ? +(m.value - prev.value).toFixed(2) : null;
                    return (
                      <TableRow key={m.id} hover>
                        <TableCell sx={{ fontWeight: 600 }}>{fmtDate(m.measured_at)}</TableCell>
                        <TableCell align="right">
                          <Typography fontWeight={800} component="span">{fmtNum(m.value)} </Typography>
                          <Typography variant="caption" color="text.secondary">{m.unit}</Typography>
                          {diff !== null && diff !== 0 && (
                            <Typography variant="caption" display="block" sx={{ color: diff > 0 ? palette.coral : palette.blue }} fontWeight={700}>
                              {diff > 0 ? "▲ +" : "▼ "}{diff}
                            </Typography>
                          )}
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
            <Box px={2.5} pb={2}><Pager page={histPage} pageSize={6} total={sorted.length} onChange={setHistPage} /></Box>
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
  const list = useAsync(() => api<Page<Measurement>>("/measurements", { query: { page, page_size: 12, type_id: typeId, status } }), [page, typeId, status, version]);
  const statuses = [["", "Tümü", palette.teal], ["normal", "Normal", palette.green], ["abnormal", "Referans dışı", palette.coral], ["low", "Düşük", palette.amber], ["high", "Yüksek", palette.coral]];
  return (
    <Card>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} p={2.5} alignItems={{ md: "center" }}>
        <TextField select label="Ölçüm türü" value={typeId} onChange={(e) => { setTypeId(e.target.value); setPage(1); }} sx={{ maxWidth: { md: 300 } }}>
          <MenuItem value="">Tümü</MenuItem>
          {types.map((t) => <MenuItem key={t.id} value={String(t.id)}>{t.name}</MenuItem>)}
        </TextField>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {statuses.map(([v, label, c]) => (
            <Chip key={v} label={label} onClick={() => { setStatus(v); setPage(1); }}
              sx={{ bgcolor: status === v ? c : alpha(c, 0.1), color: status === v ? "#fff" : c, "&:hover": { bgcolor: status === v ? c : alpha(c, 0.18) } }} />
          ))}
        </Stack>
      </Stack>
      {list.loading && !list.data ? <Box p={2}><LoadingState /></Box> : list.error ? <ErrorState message={list.error} onRetry={list.reload} /> :
        !list.data?.items.length ? <EmptyState title="Ölçüm bulunamadı" description="Filtreleri değiştirmeyi deneyin." /> : (
          <Box sx={{ opacity: list.loading ? 0.6 : 1, transition: "opacity .2s" }}>
            <TableContainer>
              <Table size="small">
                <TableHead><TableRow><TableCell>Ölçüm</TableCell><TableCell>Tarih</TableCell><TableCell align="right">Değer</TableCell>
                  <TableCell>Referans</TableCell><TableCell>Durum</TableCell><TableCell /></TableRow></TableHead>
                <TableBody>
                  {list.data.items.map((m) => (
                    <TableRow key={m.id} hover>
                      <TableCell>
                        <Stack direction="row" spacing={1.25} alignItems="center">
                          <IconTile icon={iconFor(m.category, m.type_code)} color={colorFor(m.category)} size={32} />
                          <Box><Typography fontWeight={700} fontSize={14}>{m.type_name}</Typography>
                            <Typography variant="caption" color="text.secondary">{m.category}</Typography></Box>
                        </Stack>
                      </TableCell>
                      <TableCell>{fmtDate(m.measured_at)}</TableCell>
                      <TableCell align="right"><b>{fmtNum(m.value)}</b> <Typography variant="caption" color="text.secondary">{m.unit}</Typography></TableCell>
                      <TableCell>{fmtRef(m.ref_min, m.ref_max)}</TableCell>
                      <TableCell><StatusChip status={m.status} /></TableCell>
                      <TableCell><RowActions m={m} onEdit={onEdit} onDelete={onDelete} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <Box px={2.5} pb={2}><Pager page={page} pageSize={12} total={list.data.total} onChange={setPage} /></Box>
          </Box>
        )}
    </Card>
  );
}

function CompareTab() {
  const theme = useTheme();
  const tip = useChartTooltip();
  const dates = useAsync(() => api<{ date: string; count: number }[]>("/measurements/dates"), []);
  const [a, setA] = useState("");
  const [b, setB] = useState("");
  // Varsayılan: en çok ölçüm içeren (laboratuvar) son iki tarih
  const all = dates.data ?? [];
  const rich = all.filter((d) => d.count >= 10).length >= 2 ? all.filter((d) => d.count >= 10) : all.filter((d) => d.count >= 4);
  const da = a || rich[1]?.date || dates.data?.[1]?.date || "";
  const db = b || rich[0]?.date || dates.data?.[0]?.date || "";
  const cmp = useAsync(() => (da && db ? api<CompareRow[]>("/measurements/compare", { query: { date_a: da, date_b: db } }) : Promise.resolve([])), [da, db]);
  const rows = (cmp.data ?? []).filter((r) => r.a && r.b);
  const chart = rows.filter((r) => r.comparable && r.change_pct != null).map((r) => ({ name: r.name, pct: r.change_pct!, color: colorFor(r.category) }));
  const DateSelect = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
    <TextField select label={label} value={value} onChange={(e) => onChange(e.target.value)}>
      {(dates.data ?? []).map((d) => <MenuItem key={d.date} value={d.date}>{fmtDate(d.date)} · {d.count} ölçüm</MenuItem>)}
    </TextField>
  );
  return (
    <Stack spacing={2.5}>
      <Card sx={{ p: 2.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2} alignItems="center">
          <DateSelect label="Önceki ölçüm tarihi" value={da} onChange={setA} />
          <IconTile icon={<CompareArrowsRoundedIcon />} color={palette.violet} size={42} solid />
          <DateSelect label="Yeni ölçüm tarihi" value={db} onChange={setB} />
        </Stack>
      </Card>
      {cmp.loading ? <LoadingState /> : !rows.length ? (
        <Card><EmptyState icon={<CompareArrowsRoundedIcon />} color={palette.violet} title="Karşılaştırılacak ortak ölçüm yok"
          description="Seçilen iki tarihte aynı ölçüm türünden değer bulunmalı. Laboratuvar tarihlerini seçmeyi deneyin." /></Card>
      ) : (
        <Grid container spacing={2.5}>
          {chart.length > 0 && (
            <Grid size={{ xs: 12, lg: 5 }}>
              <SectionCard title="Yüzde değişim" subtitle="Yeni tarihin öncekine göre farkı" icon={<CompareArrowsRoundedIcon />} color={palette.violet}>
                <Box height={Math.max(260, chart.length * 30)}>
                  <ResponsiveContainer>
                    <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 16 }}>
                      <CartesianGrid strokeDasharray="4 6" horizontal={false} stroke={theme.palette.divider} />
                      <XAxis type="number" {...axisProps(theme.palette.text.secondary)} unit="%" />
                      <YAxis type="category" dataKey="name" width={120} {...axisProps(theme.palette.text.secondary)} />
                      <ReferenceLine x={0} stroke={theme.palette.text.secondary} />
                      <RTooltip {...tip} formatter={(v: number) => [`%${v}`, "Değişim"]} cursor={{ fill: alpha(palette.slate, 0.08) }} />
                      <Bar dataKey="pct" radius={6} barSize={14}>
                        {chart.map((c) => <Cell key={c.name} fill={c.color} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </SectionCard>
            </Grid>
          )}
          <Grid size={{ xs: 12, lg: chart.length ? 7 : 12 }}>
            <SectionCard title="Değer karşılaştırması" icon={<HistoryRoundedIcon />} color={palette.blue} pad={false}>
              <TableContainer>
                <Table size="small">
                  <TableHead><TableRow><TableCell>Ölçüm</TableCell><TableCell align="right">{fmtDate(da)}</TableCell>
                    <TableCell align="right">{fmtDate(db)}</TableCell><TableCell align="right">Değişim</TableCell><TableCell>Yeni durum</TableCell></TableRow></TableHead>
                  <TableBody>
                    {rows.map((r) => {
                      const up = (r.change ?? 0) > 0;
                      return (
                        <TableRow key={r.type_id} hover>
                          <TableCell>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                              <IconTile icon={iconFor(r.category)} color={colorFor(r.category)} size={30} />
                              <Typography fontWeight={700} fontSize={14}>{r.name}</Typography>
                            </Stack>
                          </TableCell>
                          <TableCell align="right">{fmtNum(r.a!.value)} <Typography variant="caption" color="text.secondary">{r.a!.unit}</Typography></TableCell>
                          <TableCell align="right"><b>{fmtNum(r.b!.value)}</b> <Typography variant="caption" color="text.secondary">{r.b!.unit}</Typography></TableCell>
                          <TableCell align="right">
                            {r.comparable ? (
                              <Chip size="small" icon={up ? <NorthEastRoundedIcon /> : <SouthEastRoundedIcon />} label={`${up ? "+" : ""}${r.change} (${r.change_pct ?? 0}%)`}
                                sx={{ bgcolor: alpha(up ? palette.coral : palette.blue, 0.1), color: up ? palette.coral : palette.blue, "& .MuiChip-icon": { color: "inherit", fontSize: 14 } }} />
                            ) : <Typography variant="caption" color="warning.main">{r.note}</Typography>}
                          </TableCell>
                          <TableCell><StatusChip status={r.b!.status} /></TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </SectionCard>
          </Grid>
        </Grid>
      )}
    </Stack>
  );
}

export default function Measurements() {
  const [params, setParams] = useSearchParams();
  const notify = useNotify();
  const [tab, setTab] = useState(0);
  const [version, setVersion] = useState(0);
  const [editing, setEditing] = useState<Measurement | null>(null);
  const [open, setOpen] = useState(false);
  const [toDelete, setToDelete] = useState<Measurement | null>(null);
  const [busy, setBusy] = useState(false);
  const dialogOpen = open || params.get("new") === "1";
  const close = () => { setOpen(false); setEditing(null); if (params.get("new")) setParams({}, { replace: true }); };
  const onEdit = (m: Measurement) => { setEditing(m); setOpen(true); };
  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await api(`/measurements/${toDelete.id}`, { method: "DELETE" });
      notify("Ölçüm silindi.");
      setToDelete(null);
      setVersion((v) => v + 1);
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Ölçümlerim" eyebrow="Takip" subtitle="Göstergelerinizin zaman içindeki değişimini izleyin ve karşılaştırın."
        icon={<MonitorHeartRoundedIcon />} color={palette.pink}
        action={<Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setOpen(true)}>Ölçüm ekle</Button>} />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile
        sx={{ mb: 2.5, p: 0.5, borderRadius: 4, display: "inline-flex", maxWidth: "100%", bgcolor: (t) => alpha(t.palette.text.primary, 0.05),
          "& .MuiTabs-indicator": { display: "none" },
          "& .Mui-selected": { bgcolor: "background.paper", boxShadow: "0 2px 10px rgba(11,21,51,0.1)" } }}>
        <Tab label="Göstergeler ve grafik" />
        <Tab label="Tüm ölçümler" />
        <Tab label="Karşılaştırma" />
      </Tabs>
      {tab === 0 && <IndicatorsTab onEdit={onEdit} onDelete={setToDelete} version={version} />}
      {tab === 1 && <AllTab onEdit={onEdit} onDelete={setToDelete} version={version} />}
      {tab === 2 && <CompareTab />}
      <MeasurementDialog open={dialogOpen} measurement={editing} onClose={close}
        onSaved={() => { notify(editing ? "Ölçüm güncellendi." : "Ölçüm eklendi."); close(); setVersion((v) => v + 1); }} />
      <ConfirmDialog open={!!toDelete} title="Ölçümü sil" busy={busy} onCancel={() => setToDelete(null)} onConfirm={remove}
        message={`${toDelete?.type_name} (${toDelete?.value} ${toDelete?.unit}, ${fmtDate(toDelete?.measured_at)}) kalıcı olarak silinecek.`} />
    </>
  );
}
