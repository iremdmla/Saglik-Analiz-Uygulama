import CategoryRoundedIcon from "@mui/icons-material/CategoryRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import TableChartRoundedIcon from "@mui/icons-material/TableChartRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import {
  alpha, Box, Button, Card, Chip, CircularProgress, LinearProgress, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Tooltip, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip as RTooltip } from "recharts";
import { api } from "../api/client";
import type { AnalysisResult } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  EmptyState, ErrorState, errorMessage, fmtDate, fmtDateTime, fmtNum, fmtRef, HeroCard, IconTile, LoadingState, MedicalDisclaimer, PageHeader,
  Pager, RangeBar, RingGauge, SectionCard, Sparkline, StatusChip, useAsync,
} from "../components/common";
import { iconFor } from "../components/icons";
import { useChartTooltip } from "../components/TrendChart";
import { colorFor, gradients, palette, statusMeta } from "../theme";
import { TrendIcon } from "./Dashboard";

type HistoryRow = { id: number; created_at: string; abnormal_count: number; total_types: number };

export default function Analysis() {
  const tip = useChartTooltip();
  const result = useAsync(() => api<AnalysisResult>("/analysis/overview"), []);
  const [histPage, setHistPage] = useState(1);
  const history = useAsync(() => api<{ items: HistoryRow[]; total: number }>("/analysis/history", { query: { page: histPage } }), [histPage]);
  const [filter, setFilter] = useState<"all" | "abnormal">("all");
  const [running, setRunning] = useState(false);
  const notify = useNotify();

  const run = async () => {
    setRunning(true);
    try {
      result.setData(await api<AnalysisResult>("/analysis/run", { method: "POST" }));
      history.reload();
      notify("Analiz oluşturuldu ve kaydedildi.");
    } catch (e) {
      notify(errorMessage(e), "error");
    } finally {
      setRunning(false);
    }
  };

  if (result.loading) return <LoadingState rows={6} />;
  if (result.error || !result.data) return <ErrorState message={result.error ?? ""} onRetry={result.reload} />;
  const r = result.data;
  const rows = r.items.filter((i) => filter === "all" || i.status === "low" || i.status === "high");
  const graded = r.normal_count + r.abnormal_count;
  const score = graded ? Math.round((r.normal_count / graded) * 100) : 0;
  const dist = (["normal", "low", "high", "unknown"] as const)
    .map((s) => ({ name: statusMeta[s].label, value: r.items.filter((i) => i.status === s).length, color: statusMeta[s].color }))
    .filter((d) => d.value > 0);
  const cats = [...new Set(r.items.map((i) => i.category))].map((c) => {
    const its = r.items.filter((i) => i.category === c && i.status !== "unknown");
    return { c, total: its.length, ok: its.filter((i) => i.status === "normal").length };
  }).filter((x) => x.total > 0).sort((a, b) => a.ok / a.total - b.ok / b.total);

  return (
    <>
      <PageHeader title="Analizler" eyebrow="Analiz motoru" subtitle="Referans karşılaştırması, değişim ve eğilim hesaplaması – deterministik Python analizi."
        icon={<InsightsRoundedIcon />} color={palette.green}
        action={<Button variant="contained" startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRoundedIcon />}
          onClick={run} disabled={running}>Analizi çalıştır ve kaydet</Button>} />
      {!r.total_types ? (
        <Card><EmptyState icon={<InsightsRoundedIcon />} color={palette.green} title="Analiz için veri yok" description="Ölçüm ekledikçe analizleriniz burada oluşur." /></Card>
      ) : (
        <Stack spacing={2.5}>
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 5 }}>
              <HeroCard gradient={gradients.hero} sx={{ height: "100%", display: "flex", alignItems: "center" }}>
                <Stack direction="row" spacing={3} p={3} alignItems="center" justifyContent="center">
                  <RingGauge value={score} size={150} thickness={14} colors={["#5EEAD4", "#C4B5FD"]} track={alpha("#fff", 0.15)}>
                    <Typography variant="h3" fontSize={36}>%{score}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>referans uyumu</Typography>
                  </RingGauge>
                  <Stack spacing={1.25}>
                    {[["Analiz edilen", r.total_types], ["Aralıkta", r.normal_count], ["Referans dışı", r.abnormal_count], ["BMI", r.bmi ? `${r.bmi} · ${r.bmi_category}` : "—"]].map(([k, v]) => (
                      <Box key={k as string}><Typography variant="caption" sx={{ opacity: 0.7 }}>{k}</Typography><Typography fontWeight={800} fontSize={18} lineHeight={1.1}>{v}</Typography></Box>
                    ))}
                  </Stack>
                </Stack>
              </HeroCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3 }}>
              <SectionCard title="Durum dağılımı" icon={<InsightsRoundedIcon />} color={palette.violet}>
                <Box height={150} position="relative">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={dist} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={3} cornerRadius={6} stroke="none">
                        {dist.map((d) => <Cell key={d.name} fill={d.color} />)}
                      </Pie>
                      <RTooltip {...tip} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Stack position="absolute" sx={{ inset: 0, pointerEvents: "none" }} alignItems="center" justifyContent="center">
                    <Typography variant="h5">{r.total_types}</Typography><Typography variant="caption" color="text.secondary">gösterge</Typography>
                  </Stack>
                </Box>
                <Stack direction="row" flexWrap="wrap" gap={1} justifyContent="center" mt={1}>
                  {dist.map((d) => <Chip key={d.name} size="small" label={`${d.name} ${d.value}`} sx={{ bgcolor: alpha(d.color, 0.12), color: d.color }} />)}
                </Stack>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title="Kategori bazında uyum" subtitle="Referans aralığındaki gösterge oranı" icon={<CategoryRoundedIcon />} color={palette.blue}>
                <Stack spacing={1.5}>
                  {cats.slice(0, 6).map((x) => {
                    const pct = Math.round((x.ok / x.total) * 100);
                    const c = colorFor(x.c);
                    return (
                      <Box key={x.c}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight={700}>{x.c}</Typography>
                          <Typography variant="body2" color="text.secondary">{x.ok}/{x.total}</Typography>
                        </Stack>
                        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, bgcolor: alpha(c, 0.14), "& .MuiLinearProgress-bar": { background: `linear-gradient(90deg, ${alpha(c, 0.6)}, ${c})` } }} />
                      </Box>
                    );
                  })}
                </Stack>
              </SectionCard>
            </Grid>
          </Grid>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <SectionCard title="Gösterge bazında sonuçlar" icon={<TableChartRoundedIcon />} color={palette.teal} pad={false} action={
                <Stack direction="row" spacing={0.75}>
                  {(["all", "abnormal"] as const).map((f) => (
                    <Chip key={f} label={f === "all" ? `Tümü (${r.items.length})` : `Referans dışı (${r.abnormal_count})`} onClick={() => setFilter(f)}
                      sx={{ bgcolor: filter === f ? (f === "all" ? palette.teal : palette.coral) : (t) => alpha(t.palette.text.primary, 0.06), color: filter === f ? "#fff" : "text.secondary" }} />
                  ))}
                </Stack>}>
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Gösterge</TableCell><TableCell align="right">Son değer</TableCell><TableCell sx={{ minWidth: 150 }}>Referans konumu</TableCell>
                      <TableCell>Trend</TableCell><TableCell>Durum</TableCell></TableRow></TableHead>
                    <TableBody>
                      {rows.map((i) => {
                        const c = colorFor(i.category);
                        return (
                          <TableRow key={i.type_id} hover>
                            <TableCell>
                              <Stack direction="row" spacing={1.25} alignItems="center">
                                <IconTile icon={iconFor(i.category, i.code)} color={c} size={32} />
                                <Box minWidth={0}>
                                  <Typography fontWeight={700} fontSize={14}>{i.name}</Typography>
                                  <Typography variant="caption" color="text.secondary">{fmtDate(i.latest_date)} · {i.count} ölçüm</Typography>
                                  {i.notes.filter((n) => !n.startsWith("Referans aralığı tanımlı")).map((n) => <Typography key={n} variant="caption" display="block" sx={{ color: palette.amber }}>{n}</Typography>)}
                                </Box>
                              </Stack>
                            </TableCell>
                            <TableCell align="right" sx={{ whiteSpace: "nowrap" }}><b>{fmtNum(i.latest_value)}</b> <Typography variant="caption" color="text.secondary">{i.unit}</Typography></TableCell>
                            <TableCell>
                              <RangeBar value={i.latest_value} min={i.ref_min} max={i.ref_max} status={i.status} height={5} />
                              <Typography variant="caption" color="text.secondary">{fmtRef(i.ref_min, i.ref_max)}</Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title={i.slope_per_30_days != null ? `Doğrusal eğilim: 30 günde ${i.slope_per_30_days} ${i.unit}` : "Eğilim için en az 3 ölçüm gerekir"}>
                                <Stack spacing={0.5} width={90}>
                                  <Sparkline data={i.history.map((h) => h.value)} color={c} width={90} height={24} />
                                  <TrendIcon item={i} />
                                </Stack>
                              </Tooltip>
                            </TableCell>
                            <TableCell><StatusChip status={i.status} /></TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={2.5}>
                <Card sx={{ p: 2.75, border: 0, background: (t) => t.palette.mode === "dark" ? "linear-gradient(160deg, #2E1065 0%, #13204A 100%)" : "linear-gradient(160deg, #F3EEFF 0%, #EEF6FF 100%)" }}>
                  <Stack direction="row" spacing={1.5} alignItems="center" mb={2}>
                    <IconTile icon={<TipsAndUpdatesRoundedIcon />} color={palette.violet} size={42} solid />
                    <Box><Typography variant="h6">Öne çıkan bulgular</Typography><Typography variant="caption" color="text.secondary">Otomatik oluşturulan içgörüler</Typography></Box>
                  </Stack>
                  {r.insights.length ? (
                    <Stack spacing={1}>
                      {r.insights.map((s) => (
                        <Box key={s} sx={{ p: 1.5, borderRadius: 3, bgcolor: (t) => alpha(t.palette.background.paper, 0.7), borderLeft: `3px solid ${palette.violet}` }}>
                          <Typography variant="body2">{s}</Typography>
                        </Box>
                      ))}
                    </Stack>
                  ) : <Typography color="text.secondary">Tüm göstergeler referans aralığında.</Typography>}
                  <Typography variant="caption" color="text.secondary" display="block" mt={2}>
                    Değerler yapay zekâ tarafından değil, Python analiz motoru tarafından hesaplanır. Farklı birimdeki ölçümler karşılaştırılmaz.
                  </Typography>
                </Card>
                <SectionCard title="Analiz geçmişi" icon={<HistoryRoundedIcon />} color={palette.blue} fill={false}>
                  {history.data?.items.length ? (
                    <>
                      <Stack spacing={1}>
                        {history.data.items.map((h) => (
                          <Stack key={h.id} direction="row" spacing={1.5} alignItems="center" sx={{ p: 1.25, borderRadius: 3, bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                            <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: h.abnormal_count ? palette.coral : palette.green }} />
                            <Box flex={1}><Typography fontWeight={700} fontSize={14}>{fmtDateTime(h.created_at)}</Typography>
                              <Typography variant="caption" color="text.secondary">{h.total_types} gösterge · {h.abnormal_count} referans dışı</Typography></Box>
                          </Stack>
                        ))}
                      </Stack>
                      <Pager page={histPage} pageSize={5} total={history.data.total} onChange={setHistPage} />
                    </>
                  ) : <Typography color="text.secondary" variant="body2">Henüz kaydedilmiş analiz yok. "Analizi çalıştır" ile oluşturabilirsiniz.</Typography>}
                </SectionCard>
              </Stack>
            </Grid>
          </Grid>
          <MedicalDisclaimer text={r.disclaimer} />
        </Stack>
      )}
    </>
  );
}
