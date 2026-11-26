import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import HistoryIcon from "@mui/icons-material/History";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import ReportProblemOutlinedIcon from "@mui/icons-material/ReportProblemOutlined";
import {
  alpha, Box, Button, Card, CircularProgress, List, ListItem, ListItemIcon, ListItemText, Stack, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";
import { api } from "../api/client";
import type { AnalysisResult } from "../api/types";
import { useNotify } from "../components/AppProviders";
import {
  EmptyState, ErrorState, errorMessage, fmtDate, fmtDateTime, fmtRef, LoadingState, MedicalDisclaimer, PageHeader, Pager,
  SectionCard, StatCard, StatusChip, useAsync,
} from "../components/common";
import { tokens } from "../theme";
import { TrendIcon } from "./Dashboard";

type HistoryRow = { id: number; created_at: string; abnormal_count: number; total_types: number };

export default function Analysis() {
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

  return (
    <>
      <PageHeader title="Analizler" subtitle="Deterministik analiz motoru: referans karşılaştırması, değişim ve eğilim hesaplaması."
        action={<Button variant="contained" startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrowRoundedIcon />}
          onClick={run} disabled={running}>Analizi çalıştır ve kaydet</Button>} />
      {!r.total_types ? (
        <Card><EmptyState icon={<InsightsOutlinedIcon fontSize="large" />} title="Analiz için veri yok" description="Ölçüm ekledikçe analizleriniz burada oluşur." /></Card>
      ) : (
        <Stack spacing={2}>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, md: 3 }}><StatCard label="Analiz edilen gösterge" value={r.total_types} icon={<InsightsOutlinedIcon />} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatCard label="Referans aralığında" value={r.normal_count} icon={<CheckCircleOutlineIcon />} color={tokens.status.normal} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatCard label="Referans dışında" value={r.abnormal_count} icon={<ReportProblemOutlinedIcon />} color={tokens.status.high} /></Grid>
            <Grid size={{ xs: 6, md: 3 }}><StatCard label="BMI" value={r.bmi ?? "—"} hint={r.bmi_category ?? undefined} icon={<InsightsOutlinedIcon />} color={tokens.chart[1]} /></Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <SectionCard title="Gösterge bazında sonuçlar" pad={false} action={
                <ToggleButtonGroup size="small" exclusive value={filter} onChange={(_, v) => v && setFilter(v)}>
                  <ToggleButton value="all">Tümü</ToggleButton>
                  <ToggleButton value="abnormal">Referans dışı</ToggleButton>
                </ToggleButtonGroup>}>
                <TableContainer>
                  <Table size="small">
                    <TableHead><TableRow><TableCell>Gösterge</TableCell><TableCell align="right">Son değer</TableCell><TableCell>Referans</TableCell>
                      <TableCell>Önceki</TableCell><TableCell>Eğilim</TableCell><TableCell>Durum</TableCell></TableRow></TableHead>
                    <TableBody>
                      {rows.map((i) => (
                        <TableRow key={i.type_id} hover>
                          <TableCell>
                            <Typography fontWeight={600}>{i.name}</Typography>
                            <Typography variant="caption" color="text.secondary">{i.category} · {fmtDate(i.latest_date)} · {i.count} ölçüm</Typography>
                            {i.notes.map((n) => <Typography key={n} variant="caption" display="block" color="warning.main">{n}</Typography>)}
                          </TableCell>
                          <TableCell align="right"><b>{i.latest_value}</b> <Typography variant="caption" color="text.secondary">{i.unit}</Typography></TableCell>
                          <TableCell>{fmtRef(i.ref_min, i.ref_max)}</TableCell>
                          <TableCell>{i.previous_value ?? "—"}</TableCell>
                          <TableCell>
                            <Tooltip title={i.slope_per_30_days != null ? `Doğrusal eğilim: 30 günde ${i.slope_per_30_days} ${i.unit}` : "Eğilim için en az 3 ölçüm gerekir"}>
                              <Box display="inline-flex"><TrendIcon item={i} />{i.trend === "insufficient" && <Typography variant="caption" color="text.secondary">—</Typography>}</Box>
                            </Tooltip>
                          </TableCell>
                          <TableCell><StatusChip status={i.status} /></TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <Stack spacing={2}>
                <SectionCard title="Öne çıkan bulgular">
                  {r.insights.length ? (
                    <List dense disablePadding>
                      {r.insights.map((s) => (
                        <ListItem key={s} disableGutters alignItems="flex-start">
                          <ListItemIcon sx={{ minWidth: 32, mt: 0.5 }}><LightbulbOutlinedIcon fontSize="small" color="warning" /></ListItemIcon>
                          <ListItemText primary={s} />
                        </ListItem>
                      ))}
                    </List>
                  ) : <Typography color="text.secondary">Tüm göstergeler referans aralığında.</Typography>}
                  <Box mt={2} p={1.5} borderRadius={2} bgcolor={(t) => alpha(t.palette.primary.main, 0.06)}>
                    <Typography variant="caption" color="text.secondary">
                      Değerler yapay zekâ tarafından değil, Python analiz motoru tarafından hesaplanır. Farklı birimdeki ölçümler karşılaştırılmaz.
                    </Typography>
                  </Box>
                </SectionCard>
                <SectionCard title={<Stack direction="row" spacing={1} alignItems="center"><HistoryIcon fontSize="small" /><span>Analiz geçmişi</span></Stack>}>
                  {history.data?.items.length ? (
                    <>
                      <List dense disablePadding>
                        {history.data.items.map((h) => (
                          <ListItem key={h.id} disableGutters>
                            <ListItemText primary={fmtDateTime(h.created_at)} secondary={`${h.total_types} gösterge · ${h.abnormal_count} referans dışı`} />
                          </ListItem>
                        ))}
                      </List>
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
