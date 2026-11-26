import CakeOutlinedIcon from "@mui/icons-material/CakeOutlined";
import HeightIcon from "@mui/icons-material/Height";
import MonitorWeightOutlinedIcon from "@mui/icons-material/MonitorWeightOutlined";
import BloodtypeOutlinedIcon from "@mui/icons-material/BloodtypeOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import { Box, Button, CircularProgress, LinearProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api/client";
import type { Profile as ProfileT } from "../api/types";
import { useNotify } from "../components/AppProviders";
import { ErrorState, errorMessage, LoadingState, PageHeader, SectionCard, StatCard, today, useAsync } from "../components/common";
import { tokens } from "../theme";

type Form = Record<string, string>;
const FIELDS = ["birth_date", "gender", "height_cm", "weight_kg", "blood_type", "activity_level", "chronic_conditions",
  "medications", "allergies", "notes"] as const;

export default function Profile() {
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
  const bmiPct = data.bmi ? Math.min(100, Math.max(0, ((data.bmi - 15) / 25) * 100)) : 0;

  return (
    <>
      <PageHeader title="Sağlık Profilim" subtitle="Temel sağlık bilgileriniz analizlerde bağlam olarak kullanılır." />
      <Grid container spacing={2} mb={2}>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label="Yaş" value={data.age ?? "—"} icon={<CakeOutlinedIcon />} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label="Boy" value={data.height_cm ? `${data.height_cm} cm` : "—"} icon={<HeightIcon />} color={tokens.chart[1]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label="Kilo" value={data.weight_kg ? `${data.weight_kg} kg` : "—"} icon={<MonitorWeightOutlinedIcon />} color={tokens.chart[2]} /></Grid>
        <Grid size={{ xs: 6, md: 3 }}><StatCard label="Kan grubu" value={data.blood_type ?? "—"} icon={<BloodtypeOutlinedIcon />} color={tokens.status.high} /></Grid>
      </Grid>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, lg: 8 }}>
          <SectionCard title="Profil bilgileri">
            <Box component="form" onSubmit={submit}>
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
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField type="number" label="Boy (cm)" value={form.height_cm ?? ""} onChange={set("height_cm")}
                    slotProps={{ htmlInput: { min: 50, max: 250, step: 0.1 } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField type="number" label="Kilo (kg)" value={form.weight_kg ?? ""} onChange={set("weight_kg")}
                    slotProps={{ htmlInput: { min: 2, max: 400, step: 0.1 } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField select label="Kan grubu" value={form.blood_type ?? ""} onChange={set("blood_type")}>
                    <MenuItem value="">Seçilmedi</MenuItem>
                    {["A+", "A-", "B+", "B-", "AB+", "AB-", "0+", "0-"].map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField select label="Fiziksel aktivite düzeyi" value={form.activity_level ?? ""} onChange={set("activity_level")}>
                    <MenuItem value="">Seçilmedi</MenuItem>
                    {["Düşük", "Orta", "Yüksek"].map((b) => <MenuItem key={b} value={b}>{b}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Alerjiler" value={form.allergies ?? ""} onChange={set("allergies")} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Kronik durumlar" multiline minRows={2} value={form.chronic_conditions ?? ""} onChange={set("chronic_conditions")} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField label="Kullanılan ilaçlar" multiline minRows={2} value={form.medications ?? ""} onChange={set("medications")} slotProps={{ htmlInput: { maxLength: 1000 } }} />
                </Grid>
                <Grid size={12}>
                  <TextField label="Notlar" multiline minRows={2} value={form.notes ?? ""} onChange={set("notes")} slotProps={{ htmlInput: { maxLength: 2000 } }} />
                </Grid>
              </Grid>
              <Stack direction="row" justifyContent="flex-end" mt={2}>
                <Button type="submit" variant="contained" startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />} disabled={busy}>
                  Kaydet
                </Button>
              </Stack>
            </Box>
          </SectionCard>
        </Grid>
        <Grid size={{ xs: 12, lg: 4 }}>
          <SectionCard title="Beden Kitle İndeksi (BMI)">
            {data.bmi ? (
              <Stack spacing={2}>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                  <Typography variant="h3" fontWeight={800}>{data.bmi}</Typography>
                  <Typography color="text.secondary">kg/m²</Typography>
                </Stack>
                <Typography fontWeight={700} color="primary.main">{data.bmi_category}</Typography>
                <Box>
                  <LinearProgress variant="determinate" value={bmiPct} sx={{ height: 10, borderRadius: 5,
                    background: `linear-gradient(90deg, ${tokens.status.low} 0 14%, ${tokens.status.normal} 14% 40%, ${tokens.status.low} 40% 60%, ${tokens.status.high} 60%)`,
                    "& .MuiLinearProgress-bar": { bgcolor: "transparent", borderRight: "3px solid", borderColor: "text.primary" } }} />
                  <Stack direction="row" justifyContent="space-between" mt={0.5}>
                    {["15", "18.5", "25", "30", "40"].map((v) => <Typography key={v} variant="caption" color="text.secondary">{v}</Typography>)}
                  </Stack>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  BMI, kilonun boyun karesine bölünmesiyle hesaplanır (WHO sınıflaması). Kas kütlesini ve yağ dağılımını yansıtmaz.
                </Typography>
              </Stack>
            ) : (
              <Typography color="text.secondary">BMI hesaplanabilmesi için boy ve kilo bilgilerinizi girin.</Typography>
            )}
          </SectionCard>
        </Grid>
      </Grid>
    </>
  );
}
