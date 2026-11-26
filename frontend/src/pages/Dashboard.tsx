import AddIcon from "@mui/icons-material/Add";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MonitorWeightOutlinedIcon from "@mui/icons-material/MonitorWeightOutlined";
import RemoveIcon from "@mui/icons-material/Remove";
import ScienceOutlinedIcon from "@mui/icons-material/ScienceOutlined";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import WarningAmberOutlinedIcon from "@mui/icons-material/WarningAmberOutlined";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import {
  Alert, alpha, Box, Button, Card, CardActionArea, Chip, List, ListItem, ListItemText, Stack, Typography, useTheme,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";
import type { AnalysisItem, Measurement, Overview, Profile } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import {
  EmptyState, ErrorState, fmtDate, LoadingState, MedicalDisclaimer, SectionCard, StatCard, StatusChip, useAsync,
} from "../components/common";
import TrendChart from "../components/TrendChart";
import { statusMeta, tokens } from "../theme";

const KEY_CODES = ["HGB", "FERRITIN", "B12", "VITD", "GLU", "HBA1C", "LDL", "TSH", "SYS", "WEIGHT"];

export function TrendIcon({ item }: { item: Pick<AnalysisItem, "trend" | "change_pct"> }) {
  if (item.trend === "insufficient") return null;
  const Icon = item.trend === "up" ? ArrowUpwardIcon : item.trend === "down" ? ArrowDownwardIcon : RemoveIcon;
  return (
    <Stack direction="row" alignItems="center" spacing={0.25} color="text.secondary">
      <Icon sx={{ fontSize: 14 }} />
      <Typography variant="caption" fontWeight={600}>{item.change_pct != null ? `%${Math.abs(item.change_pct)}` : ""}</Typography>
    </Stack>
  );
}

export function IndicatorCard({ item, selected, onClick }: { item: AnalysisItem; selected?: boolean; onClick?: () => void }) {
  const theme = useTheme();
  const color = statusMeta[item.status].color;
  return (
    <Card sx={{ height: "100%", borderColor: selected ? "primary.main" : undefined, borderWidth: selected ? 2 : 1 }}>
      <CardActionArea onClick={onClick} sx={{ p: 2, height: "100%" }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="body2" color="text.secondary" fontWeight={600} noWrap>{item.name}</Typography>
          <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color, mt: 0.75, boxShadow: `0 0 0 4px ${alpha(color, 0.18)}` }} />
        </Stack>
        <Stack direction="row" alignItems="baseline" spacing={0.75} mt={1}>
          <Typography variant="h5">{item.latest_value}</Typography>
          <Typography variant="caption" color="text.secondary">{item.unit}</Typography>
        </Stack>
        <Stack direction="row" justifyContent="space-between" alignItems="center" mt={0.5}>
          <Typography variant="caption" color={theme.palette.text.secondary}>{fmtDate(item.latest_date)}</Typography>
          <TrendIcon item={item} />
        </Stack>
      </CardActionArea>
    </Card>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const overview = useAsync(() => api<Overview>("/analysis/overview"), []);
  const profile = useAsync(() => api<Profile>("/profile"), []);
  const [selected, setSelected] = useState<number | null>(null);
  const items = overview.data?.items ?? [];
  const highlights = [
    ...items.filter((i) => i.status === "low" || i.status === "high"),
    ...KEY_CODES.map((c) => items.find((i) => i.code === c && i.status !== "low" && i.status !== "high")).filter(Boolean) as AnalysisItem[],
  ].slice(0, 8);
  const chartTypeId = selected ?? highlights[0]?.type_id ?? null;
  const history = useAsync(
    () => (chartTypeId ? api<Measurement[]>(`/measurements/history/${chartTypeId}`) : Promise.resolve([])), [chartTypeId]);
  const firstName = user?.full_name.split(" ")[0];
  const hour = new Date().getHours();
  const greet = hour < 12 ? "Günaydın" : hour < 18 ? "İyi günler" : "İyi akşamlar";

  const quick = [
    { label: "Yeni sağlık kaydı", icon: <AddIcon />, to: "/records?new=1", color: tokens.chart[0] },
    { label: "Ölçüm ekle", icon: <MonitorWeightOutlinedIcon />, to: "/measurements?new=1", color: tokens.chart[1] },
    { label: "Rapor yükle", icon: <UploadFileOutlinedIcon />, to: "/reports", color: tokens.chart[2] },
    { label: "Asistana sor", icon: <AutoAwesomeOutlinedIcon />, to: "/assistant", color: tokens.chart[3] },
  ];

  if (overview.loading) return <LoadingState rows={6} />;
  if (overview.error || !overview.data) return <ErrorState message={overview.error ?? ""} onRetry={overview.reload} />;
  const o = overview.data;
  const p = profile.data;

  return (
    <Stack spacing={3}>
      <Card sx={{ p: { xs: 2.5, md: 3.5 }, position: "relative", overflow: "hidden", border: 0, color: "#fff",
        background: "linear-gradient(120deg, #0E9384 0%, #107569 45%, #4E5BA6 100%)" }}>
        <Box sx={{ position: "absolute", right: -60, top: -60, width: 240, height: 240, borderRadius: "50%", bgcolor: alpha("#fff", 0.08) }} />
        <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={2} position="relative">
          <Box>
            <Typography sx={{ opacity: 0.85 }}>{new Date().toLocaleDateString("tr-TR", { weekday: "long", day: "numeric", month: "long" })}</Typography>
            <Typography variant="h4" mt={0.5}>{greet}, {firstName}</Typography>
            <Typography sx={{ opacity: 0.85 }} mt={1} maxWidth={560}>
              {o.measurement_count
                ? `${o.total_types} farklı göstergeyi takip ediyorsunuz. ${o.abnormal_count ? `${o.abnormal_count} gösterge son ölçümde referans aralığı dışında.` : "Tüm göstergeler referans aralığında."}`
                : "Sağlık verilerinizi ekleyerek takibe başlayın."}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="flex-start" flexWrap="wrap" useFlexGap>
            <Button variant="contained" onClick={() => navigate("/analysis")}
              sx={{ bgcolor: "#fff", color: "#0E9384", "&:hover": { bgcolor: alpha("#fff", 0.9) } }}>Analizi görüntüle</Button>
          </Stack>
        </Stack>
      </Card>

      {user?.is_demo && (
        <Alert severity="info" variant="outlined" sx={{ borderRadius: 3 }}>
          Bu hesaptaki tüm sağlık verileri <b>sentetik demo verisidir</b>; gerçek bir kişiye ait değildir ve tıbbi değerlendirme olarak kullanılamaz.
        </Alert>
      )}

      {o.measurement_count === 0 ? (
        <Card>
          <EmptyState title="Henüz sağlık veriniz yok"
            description="İlk tahlil sonucunuzu veya tansiyon, kilo gibi bir ölçümünüzü ekleyin; grafikler ve analizler burada görünecek."
            action={<Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/records?new=1")}>Kayıt ekle</Button>
              <Button variant="outlined" startIcon={<UploadFileOutlinedIcon />} onClick={() => navigate("/reports")}>Rapor yükle</Button>
            </Stack>} />
        </Card>
      ) : (
        <>
          <Grid container spacing={2}>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard label="Beden Kitle İndeksi" value={o.bmi ?? "—"} icon={<MonitorWeightOutlinedIcon />}
                hint={o.bmi_category ?? "Boy/kilo bilgisi ekleyin"} />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard label="Takip edilen gösterge" value={o.total_types} icon={<ScienceOutlinedIcon />} color={tokens.chart[1]}
                hint={`${o.measurement_count} ölçüm`} />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard label="Referans dışı" value={o.abnormal_count} icon={<WarningAmberOutlinedIcon />}
                color={o.abnormal_count ? tokens.status.high : tokens.status.normal} hint="Son ölçümlere göre" />
            </Grid>
            <Grid size={{ xs: 6, lg: 3 }}>
              <StatCard label="Sağlık kaydı" value={o.record_count} icon={<FolderSharedOutlinedIcon />} color={tokens.chart[2]}
                hint="Tahlil ve ölçüm kayıtları" />
            </Grid>
          </Grid>

          <Box>
            <Typography variant="h6" mb={1.5}>Öne çıkan göstergeler</Typography>
            <Grid container spacing={2}>
              {highlights.map((i) => (
                <Grid key={i.type_id} size={{ xs: 6, sm: 4, md: 3 }}>
                  <IndicatorCard item={i} selected={i.type_id === chartTypeId} onClick={() => setSelected(i.type_id)} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, lg: 8 }}>
              <SectionCard title={`Zaman içindeki değişim${history.data?.[0] ? ` · ${history.data[0].type_name}` : ""}`}
                action={history.data?.length ? <StatusChip status={history.data[history.data.length - 1].status} /> : null}>
                {history.loading ? <LoadingState rows={3} /> : history.data?.length ? (
                  <>
                    <TrendChart data={history.data} />
                    <Typography variant="caption" color="text.secondary">
                      Yeşil bant referans aralığını gösterir. Göstergelere tıklayarak grafiği değiştirebilirsiniz.
                    </Typography>
                  </>
                ) : <EmptyState title="Grafik için veri yok" />}
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 4 }}>
              <SectionCard title="Sağlık profili" action={<Button size="small" onClick={() => navigate("/profile")}>Düzenle</Button>}>
                {p ? (
                  <Stack spacing={1.25}>
                    {[
                      ["Yaş", p.age ?? "—"], ["Cinsiyet", p.gender ?? "—"], ["Boy", p.height_cm ? `${p.height_cm} cm` : "—"],
                      ["Kilo", p.weight_kg ? `${p.weight_kg} kg` : "—"], ["Kan grubu", p.blood_type ?? "—"],
                      ["Aktivite", p.activity_level ?? "—"],
                    ].map(([k, v]) => (
                      <Stack key={k} direction="row" justifyContent="space-between">
                        <Typography color="text.secondary">{k}</Typography>
                        <Typography fontWeight={600}>{v}</Typography>
                      </Stack>
                    ))}
                    {p.allergies && <Chip size="small" color="warning" variant="outlined" label={`Alerji: ${p.allergies}`} sx={{ alignSelf: "flex-start" }} />}
                  </Stack>
                ) : <LoadingState rows={2} />}
              </SectionCard>
            </Grid>
          </Grid>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 6, lg: 5 }}>
              <SectionCard title="Son ölçümler" pad={false} action={<Button size="small" onClick={() => navigate("/measurements")}>Tümü</Button>}>
                <List dense>
                  {o.recent_measurements.map((m) => (
                    <ListItem key={m.id} secondaryAction={<StatusChip status={m.status} />} sx={{ px: 2.5 }}>
                      <ListItemText primary={<Typography fontWeight={600}>{m.type_name}</Typography>}
                        secondary={`${m.value} ${m.unit} · ${fmtDate(m.measured_at)}`} />
                    </ListItem>
                  ))}
                </List>
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, md: 6, lg: 3.5 }}>
              <SectionCard title="Son raporlar" pad={false} action={<Button size="small" onClick={() => navigate("/reports")}>Tümü</Button>}>
                {o.recent_documents.length ? (
                  <List dense>
                    {o.recent_documents.map((d) => (
                      <ListItem key={d.id} sx={{ px: 2.5 }}>
                        <DescriptionOutlinedIcon color="primary" sx={{ mr: 1.5 }} />
                        <ListItemText primary={<Typography fontWeight={600} noWrap>{d.title}</Typography>}
                          secondary={`${fmtDate(d.uploaded_at)} · ${d.status === "imported" ? "Aktarıldı" : d.status === "extracted" ? "Onay bekliyor" : "Yüklendi"}`} />
                      </ListItem>
                    ))}
                  </List>
                ) : <EmptyState title="Rapor yok" description="PDF veya görsel rapor yükleyebilirsiniz." />}
              </SectionCard>
            </Grid>
            <Grid size={{ xs: 12, lg: 3.5 }}>
              <SectionCard title="Hızlı işlemler">
                <Grid container spacing={1.5}>
                  {quick.map((q) => (
                    <Grid key={q.label} size={6}>
                      <Card sx={{ boxShadow: "none" }}>
                        <CardActionArea onClick={() => navigate(q.to)} sx={{ p: 1.75, textAlign: "center" }}>
                          <Box sx={{ mx: "auto", width: 40, height: 40, borderRadius: 2.5, display: "grid", placeItems: "center",
                            bgcolor: alpha(q.color, 0.12), color: q.color, mb: 1 }}>{q.icon}</Box>
                          <Typography variant="body2" fontWeight={600}>{q.label}</Typography>
                        </CardActionArea>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </SectionCard>
            </Grid>
          </Grid>
        </>
      )}
      <MedicalDisclaimer />
    </Stack>
  );
}
