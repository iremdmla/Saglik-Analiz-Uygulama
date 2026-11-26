import AddRoundedIcon from "@mui/icons-material/AddRounded";
import ArrowOutwardRoundedIcon from "@mui/icons-material/ArrowOutwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import NorthEastRoundedIcon from "@mui/icons-material/NorthEastRounded";
import PriorityHighRoundedIcon from "@mui/icons-material/PriorityHighRounded";
import SouthEastRoundedIcon from "@mui/icons-material/SouthEastRounded";
import EastRoundedIcon from "@mui/icons-material/EastRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import UploadFileRoundedIcon from "@mui/icons-material/UploadFileRounded";
import {
  alpha, Box, Button, Card, CardActionArea, Chip, Stack, Typography, useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bar, CartesianGrid, ComposedChart, Legend, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { api } from "../api/client";
import type { AnalysisItem, Overview, Profile } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import {
  EmptyState, ErrorState, filterByPeriod, fmtDate, fmtNum, fmtShort, HeroCard, IconTile, LoadingState, MedicalDisclaimer,
  PeriodFilter, RangeBar, RingGauge, SectionCard, Sparkline, StatusChip, statusOf, useAsync, type Period,
} from "../components/common";
import { iconFor } from "../components/icons";
import TrendChart, { axisProps, useChartTooltip } from "../components/TrendChart";
import { colorFor, gradients, palette, statusMeta } from "../theme";

const KEY_CODES = ["HGB", "FERRITIN", "B12", "VITD", "GLU", "HBA1C", "LDL", "TSH", "SYS", "WEIGHT"];

export function TrendIcon({ item, light }: { item: Pick<AnalysisItem, "trend" | "change_pct">; light?: boolean }) {
  if (item.trend === "insufficient") return null;
  const Icon = item.trend === "up" ? NorthEastRoundedIcon : item.trend === "down" ? SouthEastRoundedIcon : EastRoundedIcon;
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} sx={{ px: 0.75, py: 0.25, borderRadius: 99,
      bgcolor: light ? alpha("#fff", 0.15) : (t) => alpha(t.palette.text.primary, 0.06), color: light ? "#fff" : "text.secondary" }}>
      <Icon sx={{ fontSize: 13 }} />
      <Typography variant="caption" fontWeight={700}>{item.change_pct != null ? `%${Math.abs(item.change_pct)}` : ""}</Typography>
    </Stack>
  );
}

/** Gösterge kartı: kategori rengi, sparkline ve referans çubuğu ile. */
export function IndicatorCard({ item, selected, onClick }: { item: AnalysisItem; selected?: boolean; onClick?: () => void }) {
  const color = colorFor(item.category);
  return (
    <Card sx={{ height: "100%", position: "relative", overflow: "hidden", borderColor: selected ? color : undefined,
      boxShadow: selected ? `0 0 0 2px ${color}, 0 14px 30px ${alpha(color, 0.25)}` : undefined, "&:hover": { transform: "translateY(-3px)" } }}>
      <Box sx={{ position: "absolute", right: -30, top: -30, width: 110, height: 110, borderRadius: "50%", bgcolor: alpha(color, 0.08) }} />
      <CardActionArea onClick={onClick} sx={{ p: 2, height: "100%", display: "flex", flexDirection: "column", alignItems: "stretch", gap: 1.25 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <IconTile icon={iconFor(item.category, item.code)} color={color} size={34} />
          <Box minWidth={0} flex={1}>
            <Typography variant="body2" fontWeight={700} noWrap>{item.name}</Typography>
            <Typography variant="caption" color="text.secondary">{fmtShort(item.latest_date)}</Typography>
          </Box>
          <Box sx={{ width: 9, height: 9, borderRadius: "50%", bgcolor: statusMeta[item.status].color, boxShadow: `0 0 0 4px ${alpha(statusMeta[item.status].color, 0.2)}` }} />
        </Stack>
        <Stack direction="row" alignItems="flex-end" justifyContent="space-between" spacing={1}>
          <Stack direction="row" alignItems="baseline" spacing={0.5}>
            <Typography variant="h5" lineHeight={1}>{fmtNum(item.latest_value)}</Typography>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>{item.unit}</Typography>
          </Stack>
          <Box width="50%"><Sparkline data={item.history.map((h) => h.value)} color={color} height={30} /></Box>
        </Stack>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box flex={1}><RangeBar value={item.latest_value} min={item.ref_min} max={item.ref_max} status={item.status} height={5} /></Box>
          <TrendIcon item={item} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}

function HeroStat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <Box sx={{ px: 2, py: 1.5, borderRadius: 4, bgcolor: alpha("#fff", 0.1), border: `1px solid ${alpha("#fff", 0.14)}`, backdropFilter: "blur(6px)", minWidth: 0 }}>
      <Typography variant="caption" sx={{ opacity: 0.75 }} fontWeight={600}>{label}</Typography>
      <Typography variant="h5" lineHeight={1.2}>{value}</Typography>
      {hint && <Typography variant="caption" sx={{ opacity: 0.75 }}>{hint}</Typography>}
    </Box>
  );
}

/** Aylık vital trendler: tansiyon (referans bandı ile) ve aktivite/uyku. Gerçek ölçüm geçmişinden beslenir. */
function VitalCharts({ items }: { items: AnalysisItem[] }) {
  const theme = useTheme();
  const tip = useChartTooltip();
  const get = (code: string) => items.find((i) => i.code === code);
  const join = (a?: AnalysisItem, b?: AnalysisItem) => {
    const map = new Map<string, Record<string, number | string>>();
    a?.history.forEach((h) => map.set(h.date, { date: h.date, label: fmtShort(h.date), a: h.value }));
    b?.history.forEach((h) => map.set(h.date, { ...(map.get(h.date) ?? { date: h.date, label: fmtShort(h.date) }), b: h.value }));
    return [...map.values()].sort((x, y) => String(x.date).localeCompare(String(y.date)));
  };
  const sys = get("SYS"), dia = get("DIA"), steps = get("STEPS"), sleep = get("SLEEP");
  const bp = join(sys, dia);
  const act = join(steps, sleep);
  const ax = axisProps(theme.palette.text.secondary);
  if (!bp.length && !act.length) return null;
  return (
    <Grid container spacing={2.5}>
      {bp.length > 0 && (
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Tansiyon trendi" subtitle="Aylık ölçümler · yeşil bant: 120/80 altı" icon={<FavoriteRoundedIcon />} color={palette.pink}
            action={sys && <StatusChip status={sys.status} />}>
            <Box height={240}>
              <ResponsiveContainer>
                <LineChart data={bp} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="4 6" stroke={theme.palette.divider} vertical={false} />
                  <ReferenceArea y1={60} y2={120} fill={palette.green} fillOpacity={0.06} />
                  <XAxis dataKey="label" {...ax} minTickGap={14} />
                  <YAxis {...ax} domain={[50, "dataMax + 10"]} />
                  <Tooltip {...tip} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Line dataKey="a" name="Sistolik (mmHg)" stroke={palette.pink} strokeWidth={3} dot={false} type="monotone" />
                  <Line dataKey="b" name="Diyastolik (mmHg)" stroke={palette.violet} strokeWidth={3} dot={false} type="monotone" />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
        </Grid>
      )}
      {act.length > 0 && (
        <Grid size={{ xs: 12, lg: 6 }}>
          <SectionCard title="Aktivite ve uyku" subtitle="Aylık ortalama adım ve uyku süresi" icon={<MonitorHeartRoundedIcon />} color={palette.green}
            action={steps && <Chip size="small" label={`${fmtNum(steps.latest_value)} adım`} sx={{ bgcolor: alpha(palette.green, 0.12), color: palette.green }} />}>
            <Box height={240}>
              <ResponsiveContainer>
                <ComposedChart data={act} margin={{ top: 8, right: -10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="stepsBar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={palette.green} /><stop offset="100%" stopColor={palette.teal} stopOpacity={0.5} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="4 6" stroke={theme.palette.divider} vertical={false} />
                  <XAxis dataKey="label" {...ax} minTickGap={14} />
                  <YAxis yAxisId="l" {...ax} />
                  <YAxis yAxisId="r" orientation="right" {...ax} domain={[4, 10]} />
                  <Tooltip {...tip} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                  <Bar yAxisId="l" dataKey="a" name="Adım" fill="url(#stepsBar)" radius={[8, 8, 2, 2]} barSize={14} />
                  <Line yAxisId="r" dataKey="b" name="Uyku (saat)" stroke={palette.violet} strokeWidth={3} type="monotone"
                    dot={{ r: 3, fill: palette.violet, strokeWidth: 0 }} />
                </ComposedChart>
              </ResponsiveContainer>
            </Box>
          </SectionCard>
        </Grid>
      )}
    </Grid>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const overview = useAsync(() => api<Overview>("/analysis/overview"), []);
  const profile = useAsync(() => api<Profile>("/profile"), []);
  const [selected, setSelected] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>("1y");

  if (overview.loading) return <LoadingState rows={6} />;
  if (overview.error || !overview.data) return <ErrorState message={overview.error ?? ""} onRetry={overview.reload} />;
  const o = overview.data;
  const p = profile.data;
  const items = o.items;
  const abnormal = items.filter((i) => i.status === "low" || i.status === "high");
  const keyItems = KEY_CODES.map((c) => items.find((i) => i.code === c)).filter(Boolean) as AnalysisItem[];
  const highlights = [...abnormal, ...keyItems.filter((i) => !abnormal.includes(i))].slice(0, 8);
  const chartItem = items.find((i) => i.type_id === selected) ?? highlights[0];
  const graded = o.normal_count + o.abnormal_count;
  const score = graded ? Math.round((o.normal_count / graded) * 100) : 0;
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";
  const chartColor = chartItem ? colorFor(chartItem.category) : palette.teal;
  const points = chartItem ? filterByPeriod(chartItem.history, period, (h) => h.date)
    .map((h) => ({ ...h, status: statusOf(h.value, chartItem.ref_min, chartItem.ref_max) })) : [];

  const quick = [
    { label: "Yeni kayıt", desc: "Tahlil veya ölçüm", icon: <AddRoundedIcon />, to: "/records?new=1", g: gradients.brand },
    { label: "Rapor yükle", desc: "PDF / görsel", icon: <UploadFileRoundedIcon />, to: "/reports", g: gradients.coral },
    { label: "Analiz", desc: "Değişimleri incele", icon: <InsightsRoundedIcon />, to: "/analysis", g: gradients.green },
    { label: "Asistana sor", desc: "Yapay zekâ", icon: <AutoAwesomeRoundedIcon />, to: "/assistant", g: gradients.violet },
  ];

  return (
    <Stack spacing={2.5}>
      {/* ---------- Karşılama + referans uyumu ---------- */}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <HeroCard sx={{ height: "100%" }}>
            <Stack direction={{ xs: "column", md: "row" }} spacing={3} p={{ xs: 2.5, md: 3.5 }} alignItems={{ md: "center" }}>
              <Box flex={1} minWidth={0}>
                <Chip size="small" label={new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}
                  sx={{ bgcolor: alpha("#fff", 0.15), color: "#fff", mb: 1.5 }} />
                <Typography variant="h3" sx={{ fontSize: { xs: 30, md: 40 } }}>{greet}, {user?.full_name.split(" ")[0]}</Typography>
                <Typography sx={{ opacity: 0.85, mt: 1, maxWidth: 520 }}>
                  {o.measurement_count
                    ? abnormal.length ? `${o.total_types} göstergeyi takip ediyorsunuz. ${abnormal.length} gösterge son ölçümde referans aralığı dışında; ayrıntılar aşağıda.`
                      : `${o.total_types} göstergenin tamamı son ölçümde referans aralığında. Harika gidiyorsunuz!`
                    : "Sağlık verilerinizi ekleyerek kişisel sağlık panonuzu oluşturun."}
                </Typography>
                <Grid container spacing={1.5} mt={2.5}>
                  <Grid size={4}><HeroStat label="BMI" value={o.bmi ?? "—"} hint={o.bmi_category ?? "Boy/kilo ekleyin"} /></Grid>
                  <Grid size={4}><HeroStat label="Ölçüm" value={o.measurement_count} hint={`${o.total_types} gösterge`} /></Grid>
                  <Grid size={4}><HeroStat label="Kayıt" value={o.record_count} hint="tahlil & ölçüm" /></Grid>
                </Grid>
              </Box>
              {graded > 0 && (
                <Stack alignItems="center" spacing={1}>
                  <RingGauge value={score} size={170} thickness={16} colors={["#5EEAD4", "#C4B5FD"]} track={alpha("#fff", 0.15)}>
                    <Typography variant="h3" fontSize={40}>%{score}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.8 }} fontWeight={600}>referans uyumu</Typography>
                  </RingGauge>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>{o.normal_count} / {graded} gösterge normal aralıkta</Typography>
                </Stack>
              )}
            </Stack>
          </HeroCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Dikkat gerektirenler" subtitle="Son ölçümde referans dışı" icon={<PriorityHighRoundedIcon />} color={palette.coral}
            action={abnormal.length > 0 && <Chip size="small" label={abnormal.length} sx={{ bgcolor: alpha(palette.coral, 0.14), color: palette.coral }} />}>
            {abnormal.length ? (
              <Stack spacing={1.75}>
                {abnormal.slice(0, 4).map((i) => (
                  <Box key={i.type_id} onClick={() => setSelected(i.type_id)} sx={{ cursor: "pointer" }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="baseline" mb={0.75}>
                      <Typography fontWeight={700} noWrap>{i.name}</Typography>
                      <Typography fontWeight={800} sx={{ color: statusMeta[i.status].color }}>
                        {fmtNum(i.latest_value)} <Typography component="span" variant="caption" color="text.secondary">{i.unit}</Typography>
                      </Typography>
                    </Stack>
                    <RangeBar value={i.latest_value} min={i.ref_min} max={i.ref_max} status={i.status} height={6} />
                  </Box>
                ))}
                {abnormal.length > 4 && <Button size="small" onClick={() => navigate("/analysis")} endIcon={<ArrowOutwardRoundedIcon />}>Tümünü gör</Button>}
              </Stack>
            ) : (
              <Stack alignItems="center" textAlign="center" spacing={1} py={2}>
                <IconTile icon={<CheckCircleRoundedIcon />} color={palette.green} size={56} solid />
                <Typography fontWeight={700}>Her şey yolunda</Typography>
                <Typography variant="body2" color="text.secondary">Takip edilen tüm göstergeler referans aralığında.</Typography>
              </Stack>
            )}
          </SectionCard>
        </Grid>
      </Grid>

      {user?.is_demo && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ px: 2, py: 1.25, borderRadius: 4, bgcolor: alpha(palette.violet, 0.08), border: `1px dashed ${alpha(palette.violet, 0.35)}` }}>
          <AutoAwesomeRoundedIcon sx={{ color: palette.violet, fontSize: 18 }} />
          <Typography variant="body2" color="text.secondary">Bu hesaptaki tüm sağlık verileri <b>sentetik demo verisidir</b>; gerçek bir kişiye ait değildir ve tıbbi değerlendirme olarak kullanılamaz.</Typography>
        </Stack>
      )}

      {o.measurement_count === 0 ? (
        <Card>
          <EmptyState title="Sağlık panonuz sizi bekliyor" description="İlk tahlil sonucunuzu veya tansiyon, kilo gibi bir ölçümünüzü ekleyin; grafikler, göstergeler ve analizler burada canlanacak."
            action={<Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => navigate("/records?new=1")}>Kayıt ekle</Button>
              <Button variant="outlined" startIcon={<UploadFileRoundedIcon />} onClick={() => navigate("/reports")}>Rapor yükle</Button>
            </Stack>} />
        </Card>
      ) : (
        <>
          {/* ---------- Göstergeler ---------- */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.5}>
              <Typography variant="h6">Öne çıkan göstergeler</Typography>
              <Button size="small" endIcon={<ArrowOutwardRoundedIcon />} onClick={() => navigate("/measurements")}>Tüm ölçümler</Button>
            </Stack>
            <Grid container spacing={2}>
              {highlights.map((i) => (
                <Grid key={i.type_id} size={{ xs: 6, md: 3 }}>
                  <IndicatorCard item={i} selected={i.type_id === chartItem?.type_id} onClick={() => setSelected(i.type_id)} />
                </Grid>
              ))}
            </Grid>
          </Box>

          {/* ---------- Ana grafik + profil ---------- */}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, lg: 8 }}>
              {chartItem && (
                <SectionCard title={chartItem.name} subtitle={`${chartItem.category} · ${chartItem.count} ölçüm · referans ${chartItem.ref_min ?? "—"}–${chartItem.ref_max ?? "—"} ${chartItem.unit}`}
                  icon={iconFor(chartItem.category, chartItem.code)} color={chartColor} action={<PeriodFilter value={period} onChange={setPeriod} />}>
                  <Stack direction="row" spacing={3} mb={1} flexWrap="wrap" useFlexGap>
                    <Box><Typography variant="caption" color="text.secondary">Son değer</Typography>
                      <Typography variant="h5">{fmtNum(chartItem.latest_value)} <Typography component="span" color="text.secondary">{chartItem.unit}</Typography></Typography></Box>
                    {chartItem.change_pct != null && <Box><Typography variant="caption" color="text.secondary">Önceki ölçüme göre</Typography>
                      <Typography variant="h5" sx={{ color: chartColor }}>{chartItem.change_pct > 0 ? "+" : ""}{chartItem.change_pct}%</Typography></Box>}
                    <Box><Typography variant="caption" color="text.secondary">Durum</Typography><Box mt={0.5}><StatusChip status={chartItem.status} /></Box></Box>
                  </Stack>
                  <TrendChart points={points} unit={chartItem.unit} name={chartItem.name} refMin={chartItem.ref_min} refMax={chartItem.ref_max} color={chartColor} height={290} />
                </SectionCard>
              )}
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title="Sağlık profili" icon={<FavoriteRoundedIcon />} color={palette.coral}
                action={<Button size="small" onClick={() => navigate("/profile")}>Düzenle</Button>}>
                {p ? (
                  <Stack spacing={2}>
                    <Grid container spacing={1.25}>
                      {[["Yaş", p.age ?? "—"], ["Cinsiyet", p.gender ?? "—"], ["Boy", p.height_cm ? `${p.height_cm} cm` : "—"],
                        ["Kilo", p.weight_kg ? `${p.weight_kg} kg` : "—"], ["Kan grubu", p.blood_type ?? "—"], ["Aktivite", p.activity_level ?? "—"]].map(([k, v]) => (
                        <Grid key={k} size={6}>
                          <Box sx={{ p: 1.25, borderRadius: 3, bgcolor: (t) => alpha(t.palette.text.primary, 0.035) }}>
                            <Typography variant="caption" color="text.secondary">{k}</Typography>
                            <Typography fontWeight={800}>{v}</Typography>
                          </Box>
                        </Grid>
                      ))}
                    </Grid>
                    {p.bmi && (
                      <Box>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                          <Typography variant="body2" fontWeight={700}>BMI {p.bmi}</Typography>
                          <Typography variant="body2" color="text.secondary">{p.bmi_category}</Typography>
                        </Stack>
                        <RangeBar value={p.bmi} min={18.5} max={24.9} status={p.bmi < 18.5 ? "low" : p.bmi >= 25 ? "high" : "normal"} />
                      </Box>
                    )}
                    {p.allergies && <Chip size="small" label={`Alerji: ${p.allergies}`} sx={{ alignSelf: "flex-start", bgcolor: alpha(palette.amber, 0.14), color: palette.amber }} />}
                  </Stack>
                ) : <LoadingState rows={2} />}
              </SectionCard>
            </Grid>
          </Grid>

          <VitalCharts items={items} />

          {/* ---------- Son ölçümler / raporlar / hızlı işlemler ---------- */}
          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6, lg: 5 }}>
              <SectionCard title="Son ölçümler" icon={<MonitorHeartRoundedIcon />} color={palette.pink}
                action={<Button size="small" onClick={() => navigate("/measurements")}>Tümü</Button>}>
                <Stack spacing={1}>
                  {o.recent_measurements.map((m) => (
                    <Stack key={m.id} direction="row" spacing={1.5} alignItems="center"
                      sx={{ p: 1, borderRadius: 3, transition: "background .2s", "&:hover": { bgcolor: (t) => alpha(t.palette.text.primary, 0.04) } }}>
                      <IconTile icon={iconFor(m.category, m.type_code)} color={colorFor(m.category)} size={38} />
                      <Box flex={1} minWidth={0}>
                        <Typography fontWeight={700} noWrap>{m.type_name}</Typography>
                        <Typography variant="caption" color="text.secondary">{fmtDate(m.measured_at)} · {m.source}</Typography>
                      </Box>
                      <Box textAlign="right">
                        <Typography fontWeight={800}>{fmtNum(m.value)} <Typography component="span" variant="caption" color="text.secondary">{m.unit}</Typography></Typography>
                        <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: statusMeta[m.status].color, ml: "auto", mt: 0.5 }} />
                      </Box>
                    </Stack>
                  ))}
                </Stack>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3.5 }}>
              <SectionCard title="Son raporlar" icon={<DescriptionRoundedIcon />} color={palette.amber}
                action={<Button size="small" onClick={() => navigate("/reports")}>Tümü</Button>}>
                {o.recent_documents.length ? (
                  <Stack spacing={1.5}>
                    {o.recent_documents.map((d) => {
                      const pending = d.status === "extracted";
                      const c = pending ? palette.amber : palette.green;
                      return (
                        <Card key={d.id} onClick={() => navigate("/reports")} sx={{ p: 1.75, cursor: "pointer", boxShadow: "none",
                          background: (t) => `linear-gradient(135deg, ${alpha(c, t.palette.mode === "dark" ? 0.16 : 0.09)}, transparent)`, borderColor: alpha(c, 0.25),
                          "&:hover": { transform: "translateY(-2px)" } }}>
                          <Stack direction="row" spacing={1.5} alignItems="center">
                            <IconTile icon={<DescriptionRoundedIcon />} color={c} size={38} solid />
                            <Box minWidth={0}>
                              <Typography fontWeight={700} noWrap>{d.title}</Typography>
                              <Typography variant="caption" sx={{ color: c }} fontWeight={700}>{pending ? "Onay bekliyor" : d.status === "imported" ? "Kayıtlara aktarıldı" : "Yüklendi"}</Typography>
                              <Typography variant="caption" color="text.secondary"> · {fmtShort(d.uploaded_at)}</Typography>
                            </Box>
                          </Stack>
                        </Card>
                      );
                    })}
                  </Stack>
                ) : <EmptyState icon={<DescriptionRoundedIcon />} color={palette.amber} title="Henüz rapor yok" description="PDF veya görsel rapor yükleyebilirsiniz." />}
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 3.5 }}>
              <SectionCard title="Hızlı işlemler">
                <Grid container spacing={1.5}>
                  {quick.map((q) => (
                    <Grid key={q.label} size={6}>
                      <Card sx={{ border: 0, background: q.g, color: "#fff", "&:hover": { transform: "translateY(-3px)" } }}>
                        <CardActionArea onClick={() => navigate(q.to)} sx={{ p: 1.75, minHeight: 112, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between" }}>
                          <Box sx={{ p: 0.75, borderRadius: 2.5, bgcolor: alpha("#fff", 0.2), display: "flex" }}>{q.icon}</Box>
                          <Box><Typography fontWeight={800} lineHeight={1.2}>{q.label}</Typography>
                            <Typography variant="caption" sx={{ opacity: 0.85 }}>{q.desc}</Typography></Box>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </SectionCard>
            </Grid>
          </Grid>

          {/* ---------- Bilgilendirme ---------- */}
          {o.insights.length > 0 && (
            <Card sx={{ p: { xs: 2.5, md: 3 }, border: 0, position: "relative", overflow: "hidden",
              background: (t) => t.palette.mode === "dark" ? "linear-gradient(135deg, #1E1B4B 0%, #13204A 100%)" : "linear-gradient(135deg, #F3EEFF 0%, #E8F6FF 100%)" }}>
              <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems={{ md: "center" }}>
                <Stack direction="row" spacing={2} alignItems="center" minWidth={{ md: 260 }}>
                  <IconTile icon={<TipsAndUpdatesRoundedIcon />} color={palette.violet} size={52} solid />
                  <Box><Typography variant="h6">Sağlık içgörüleri</Typography>
                    <Typography variant="body2" color="text.secondary">Analiz motorunun bulguları</Typography></Box>
                </Stack>
                <Stack spacing={0.75} flex={1}>
                  {o.insights.slice(0, 3).map((s) => (
                    <Stack key={s} direction="row" spacing={1} alignItems="flex-start">
                      <Box sx={{ width: 6, height: 6, borderRadius: "50%", bgcolor: palette.violet, mt: 1, flexShrink: 0 }} />
                      <Typography variant="body2">{s}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Button variant="outlined" color="secondary" onClick={() => navigate("/assistant")} startIcon={<AutoAwesomeRoundedIcon />}>Asistana sor</Button>
              </Stack>
            </Card>
          )}
        </>
      )}
      <MedicalDisclaimer />
    </Stack>
  );
}
