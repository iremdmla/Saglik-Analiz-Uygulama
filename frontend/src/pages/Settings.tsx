import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import {
  Alert, Button, Chip, CircularProgress, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAccessToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useColorMode, useNotify } from "../components/AppProviders";
import { errorMessage, fmtDateTime, PageHeader, SectionCard } from "../components/common";

export default function Settings() {
  const { mode, setMode } = useColorMode();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const notify = useNotify();
  const [pw, setPw] = useState({ current: "", next: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const changePassword = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (pw.next.length < 8 || !/\d/.test(pw.next)) return setError("Yeni şifre en az 8 karakter ve bir rakam içermeli.");
    if (pw.next !== pw.confirm) return setError("Yeni şifreler eşleşmiyor.");
    setBusy(true);
    try {
      await api("/auth/change-password", { method: "POST", body: { current_password: pw.current, new_password: pw.next } });
      setAccessToken(null);
      notify("Şifreniz değiştirildi. Lütfen yeniden giriş yapın.");
      await logout().catch(() => {});
      navigate("/login");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Ayarlar" subtitle="Görünüm, hesap ve güvenlik tercihleriniz." />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard title="Görünüm">
              <Typography color="text.secondary" mb={2}>Tema tercihiniz bu tarayıcıda hatırlanır.</Typography>
              <ToggleButtonGroup exclusive value={mode} onChange={(_, v) => v && setMode(v)}>
                <ToggleButton value="light" sx={{ px: 3, gap: 1 }}><LightModeOutlinedIcon fontSize="small" /> Açık</ToggleButton>
                <ToggleButton value="dark" sx={{ px: 3, gap: 1 }}><DarkModeOutlinedIcon fontSize="small" /> Koyu</ToggleButton>
              </ToggleButtonGroup>
            </SectionCard>
            <SectionCard title="Hesap bilgileri">
              <Stack spacing={1.25}>
                {[["Ad Soyad", user?.full_name], ["E-posta", user?.email], ["Kullanıcı adı", user?.username ?? "—"],
                  ["Son giriş", fmtDateTime(user?.last_login_at)], ["Kayıt tarihi", fmtDateTime(user?.created_at)]].map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between" gap={2}>
                    <Typography color="text.secondary">{k}</Typography><Typography fontWeight={600} sx={{ wordBreak: "break-all" }}>{v}</Typography>
                  </Stack>
                ))}
                <Stack direction="row" spacing={1}>
                  <Chip size="small" label={user?.role === "ADMIN" ? "Yönetici" : "Kullanıcı"} color="primary" />
                  {user?.is_demo && <Chip size="small" label="Demo hesabı" color="secondary" variant="outlined" />}
                </Stack>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2}>
            <SectionCard title="Şifre değiştir">
              <Stack component="form" spacing={2} onSubmit={changePassword}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField type="password" label="Mevcut şifre" required value={pw.current} autoComplete="current-password" onChange={(e) => setPw({ ...pw, current: e.target.value })} />
                <TextField type="password" label="Yeni şifre" required value={pw.next} autoComplete="new-password" onChange={(e) => setPw({ ...pw, next: e.target.value })} />
                <TextField type="password" label="Yeni şifre (tekrar)" required value={pw.confirm} autoComplete="new-password" onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
                <Typography variant="caption" color="text.secondary">Şifre değiştiğinde tüm cihazlardaki oturumlarınız kapatılır.</Typography>
                <Button type="submit" variant="contained" disabled={busy} sx={{ alignSelf: "flex-start" }}>
                  {busy ? <CircularProgress size={18} color="inherit" /> : "Şifreyi güncelle"}
                </Button>
              </Stack>
            </SectionCard>
            <SectionCard title="Gizlilik ve güvenlik">
              <Stack spacing={1}>
                <Typography variant="body2" color="text.secondary">• Sağlık verileriniz yalnızca size görünür; yöneticiler sağlık değerlerinizi göremez.</Typography>
                <Typography variant="body2" color="text.secondary">• Oturum anahtarlarınız tarayıcı belleğinde ve güvenli (HttpOnly) çerezde tutulur.</Typography>
                <Typography variant="body2" color="text.secondary">• Verileriniz model eğitimi için kullanılmaz.</Typography>
                <Button color="error" variant="outlined" sx={{ alignSelf: "flex-start", mt: 1 }}
                  onClick={async () => { await logout(); navigate("/login"); }}>Oturumu kapat</Button>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
