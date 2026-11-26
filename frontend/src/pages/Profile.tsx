import BadgeRoundedIcon from "@mui/icons-material/BadgeRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import HealingRoundedIcon from "@mui/icons-material/HealingRounded";
import MonitorWeightRoundedIcon from "@mui/icons-material/MonitorWeightRounded";
import SaveRoundedIcon from "@mui/icons-material/SaveRounded";
import { alpha, Avatar, Box, Button, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Profile as ProfileT } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useNotify } from "../components/AppProviders";
import {
  ErrorState, errorMessage, HeroCard, initials, LoadingState, PageHeader, RangeBar, RingGauge, SectionCard, today, useAsync,
} from "../components/common";
import { gradients, palette } from "../theme";

type Form = Record<string, string>;
const FIELDS = ["birth_date", "gender", "height_cm", "weight_kg", "blood_type", "activity_level", "chronic_conditions",
  "medications", "allergies", "notes"] as const;

const BMI_SCALE = [
  { label: "Zayıf", range: "< 18.5", color: palette.amber },
  { label: "Normal", range: "18.5 – 24.9", color: palette.green },
  { label: "Fazla kilolu", range: "25 – 29.9", color: "#FB923C" },
  { label: "Obez", range: "≥ 30", color: palette.coral },
];

export default function Profile() {
  const { user } = useAuth();
  const { data, loading, error, reload, setData } = useAsync(() => api<ProfileT>("/profile"), []);
  const [form, setForm] = useState<Form>({});
  const [busy, setBusy] = useState(false);
  const notify = useNotify();

  useEffect(() => {
    if (data) setForm(Object.fromEntries(FIELDS.map((f) => [f, data[f] == null ? "" : String(data[f])])));
  }, [data]);

  const set = (k: string) => (e: { target: { value: string } }) => setForm({ ...form, [k]: e.target.value });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = Object.fromEntries(FIELDS.map((f) => {
      const v = form[f]?.trim() ?? "";
      return [f, v === "" ? null : f === "height_cm" || f === "weight_kg" ? Number(v) : v];
    }));
    try {
      setData(await api<ProfileT>("/profile", { method: "PUT", body }));
      notify("Sağlık profiliniz kaydedildi.");
    } catch (err) {
      notify(errorMessage(err), "error");
    } finally {
      setBusy(false);
    }
  };

  if (loading) return <LoadingState rows={5} />;
  if (error || !data) return <ErrorState message={error ?? ""} onRetry={reload} />;
  const filled = FIELDS.filter((f) => data[f] != null && data[f] !== "").length;
  const completion = Math.round((filled / FIELDS.length) * 100);
  const bmiStatus = data.bmi ? (data.bmi < 18.5 ? "low" : data.bmi >= 25 ? "high" : "normal") : "unknown";

  return (
    <>
      <PageHeader title="Sağlık Profilim" eyebrow="Kişisel bilgiler" subtitle="Temel sağlık bilgileriniz analizlerde bağlam olarak kullanılır."
        icon={<FavoriteRoundedIcon />} color={palette.coral} />

      <HeroCard gradient={`linear-gradient(120deg, #0B1533 0%, #3B1F5C 50%, #F97362 120%)`} sx={{ mb: 2.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={3} p={{ xs: 2.5, md: 3.5 }} alignItems={{ md: "center" }}>
          <Avatar sx={{ width: 84, height: 84, fontSize: 30, fontWeight: 800, background: gradients.aurora, border: `4px solid ${alpha("#fff", 0.25)}` }}>
            {initials(user?.full_name)}
          </Avatar>
          <Box flex={1}>
            <Typography variant="h4">{user?.full_name}</Typography>
            <Stack direction="row" spacing={1} mt={1.25} flexWrap="wrap" useFlexGap>
              {[data.age != null && `${data.age} yaş`, data.gender, data.blood_type && `Kan grubu ${data.blood_type}`, data.activity_level && `Aktivite: ${data.activity_level}`]
                .filter(Boolean).map((t) => <Chip key={t as string} label={t} sx={{ bgcolor: alpha("#fff", 0.14), color: "#fff" }} />)}
            </Stack>
          </Box>
          <Stack direction="row" spacing={2} alignItems="center">
            <RingGauge value={completion} size={104} thickness={10} colors={["#FDBA74", "#C4B5FD"]} track={alpha("#fff", 0.15)}>
              <Typography variant="h5">%{completion}</Typography>
            </RingGauge>
            <Box><Typography fontWeight={700}>Profil tamamlanma</Typography>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>{filled} / {FIELDS.length} alan dolu</Typography></Box>
          </Stack>
        </Stack>
      </HeroCard>

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <Box component="form" onSubmit={submit}>
            <Stack spacing={2.5}>
              <SectionCard title="Temel bilgiler" icon={<BadgeRoundedIcon />} color={palette.blue}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField type="date" label="Doğum tarihi" value={form.birth_date ?? ""} onChange={set("birth_date")}
                      slotProps={{ inputLabel: { shrink: true }, htmlInput: { max: today() } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField select label="Cinsiyet" value={form.gender ?? ""} onChange={set("gender")}>
                      <MenuItem value="">Seçilmedi</MenuItem>
                      {["Kadın", "Erkek", "Diğer", "Belirtmek istemiyorum"].map((g) => <MenuItem key={g} value={g}>{g}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField type="number" label="Boy (cm)" value={form.height_cm ?? ""} onChange={set("height_cm")} slotProps={{ htmlInput: { min: 50, max: 250, step: 0.1 } }} />
                  </Grid>
                  <Grid size={{ xs: 6, sm: 4 }}>
                    <TextField type="number" label="Kilo (kg)" value={form.weight_kg ?? ""} onChange={set("weight_kg")} slotProps={{ htmlInput: { min: 2, max: 400, step: 0.1 } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 4 }}>
                    <TextField select label="Kan grubu" value={form.blood_type ?? ""} onChange={set("blood_type")}>
                      <MenuItem value="">Seçilmedi</MenuItem>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"].map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                    </TextField>
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="body2" fontWeight={700} mb={1}>Fiziksel aktivite düzeyi</Typography>
                    <Stack direction="row" spacing={1}>
                      {["Düşük", "Orta", "Yüksek"].map((lvl, i) => {
                        const c = [palette.amber, palette.teal, palette.green][i];
                        const on = form.activity_level === lvl;
                        return (
                          <Box key={lvl} onClick={() => setForm({ ...form, activity_level: on ? "" : lvl })} role="button" tabIndex={0}
                            onKeyDown={(e) => e.key === "Enter" && setForm({ ...form, activity_level: on ? "" : lvl })}
                            sx={{ flex: 1, py: 1.25, textAlign: "center", borderRadius: 3, cursor: "pointer", fontWeight: 700, transition: "all .2s",
                              border: `1.5px solid ${on ? c : alpha(c, 0.25)}`, bgcolor: on ? alpha(c, 0.15) : "transparent", color: on ? c : "text.secondary" }}>
                            {lvl}
                          </Box>
                        );
                      })}
                    </Stack>
                  </Grid>
                </Grid>
              </SectionCard>
              <SectionCard title="Sağlık geçmişi" icon={<HealingRoundedIcon />} color={palette.violet}>
                <Grid container spacing={2}>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Kronik durumlar" multiline minRows={2} value={form.chronic_conditions ?? ""} onChange={set("chronic_conditions")} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                  </Grid>
                  <Grid size={{ xs: 12, sm: 6 }}>
                    <TextField label="Kullanılan ilaçlar" multiline minRows={2} value={form.medications ?? ""} onChange={set("medications")} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Alerjiler" value={form.allergies ?? ""} onChange={set("allergies")} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                  </Grid>
                  <Grid size={12}>
                    <TextField label="Notlar" multiline minRows={2} value={form.notes ?? ""} onChange={set("notes")} slotProps={{ htmlInput: { maxLength: 2000 } }} />
                  </Grid>
                </Grid>
                <Stack direction="row" justifyContent="flex-end" mt={2.5}>
                  <Button type="submit" variant="contained" size="large" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <SaveRoundedIcon />} disabled={busy}>
                    Değişiklikleri kaydet
                  </Button>
                </Stack>
              </SectionCard>
            </Stack>
          </Box>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Beden Kitle İndeksi" subtitle="WHO sınıflaması" icon={<MonitorWeightRoundedIcon />} color={palette.teal}>
            {data.bmi ? (
              <Stack spacing={2.5}>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="h3" sx={{ background: gradients.brand, WebkitBackgroundClip: "text", color: "transparent" }}>{data.bmi}</Typography>
                  <Typography color="text.secondary">kg/m²</Typography>
                </Stack>
                <RangeBar value={data.bmi} min={18.5} max={24.9} status={bmiStatus} height={10} />
                <Stack spacing={1}>
                  {BMI_SCALE.map((s) => (
                    <Stack key={s.label} direction="row" alignItems="center" spacing={1.25}
                      sx={{ p: 1, borderRadius: 2.5, bgcolor: data.bmi_category === s.label ? alpha(s.color, 0.12) : "transparent" }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: s.color }} />
                      <Typography flex={1} fontWeight={data.bmi_category === s.label ? 800 : 500}>{s.label}</Typography>
                      <Typography variant="body2" color="text.secondary">{s.range}</Typography>
                    </Stack>
                  ))}
                </Stack>
                <Typography variant="caption" color="text.secondary">
                  BMI, kilonun boyun karesine bölünmesiyle hesaplanır. Kas kütlesini ve yağ dağılımını yansıtmaz.
                </Typography>
              </Stack>
            ) : <Typography color="text.secondary">BMI hesaplanabilmesi için boy ve kilo bilgilerinizi girin.</Typography>}
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
