import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import PaletteRoundedIcon from "@mui/icons-material/PaletteRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import { Alert, alpha, Avatar, Box, Button, Chip, CircularProgress, Stack, TextField, Typography } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, setAccessToken } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { useColorMode, useNotify } from "../components/AppProviders";
import { errorMessage, fmtDateTime, initials, PageHeader, SectionCard } from "../components/common";
import { gradients, palette } from "../theme";

/** Tema seçimi için küçük önizleme kartı. */
function ThemePreview({ dark, active, onClick }: { dark: boolean; active: boolean; onClick: () => void }) {
  const bg = dark ? "#070D22" : "#F2F6FB";
  const card = dark ? "#13234D" : "#FFFFFF";
  return (
    <Box onClick={onClick} role="button" tabIndex={0} onKeyDown={(e) => e.key === "Enter" && onClick()}
      sx={{ flex: 1, cursor: "pointer", borderRadius: 4, p: 1, transition: "all .2s", position: "relative",
        border: `2px solid ${active ? palette.teal : "transparent"}`, bgcolor: (t) => alpha(t.palette.text.primary, 0.04),
        "&:hover": { transform: "translateY(-2px)" } }}>
      <Box sx={{ height: 110, borderRadius: 3, bgcolor: bg, display: "flex", overflow: "hidden", border: 1, borderColor: "divider" }}>
        <Box sx={{ width: 34, background: gradients.sidebar, p: 0.75 }}>
          {[palette.teal, palette.coral, palette.blue, palette.violet].map((c) => <Box key={c} sx={{ height: 8, borderRadius: 1, bgcolor: alpha(c, 0.7), mb: 0.75 }} />)}
        </Box>
        <Box flex={1} p={1}>
          <Box sx={{ height: 28, borderRadius: 1.5, background: gradients.hero, mb: 0.75 }} />
          <Stack direction="row" spacing={0.75}>
            {[palette.teal, palette.amber, palette.violet].map((c) => (
              <Box key={c} flex={1} sx={{ height: 52, borderRadius: 1.5, bgcolor: card, borderTop: `3px solid ${c}` }} />
            ))}
          </Stack>
        </Box>
      </Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" mt={1} px={0.5}>
        <Typography fontWeight={700}>{dark ? "Koyu tema" : "Açık tema"}</Typography>
        {active && <CheckCircleRoundedIcon sx={{ color: palette.teal }} fontSize="small" />}
      </Stack>
    </Box>
  );
}

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
      <PageHeader title="Ayarlar" eyebrow="Hesap" subtitle="Görünüm, hesap ve güvenlik tercihleriniz." icon={<SettingsRoundedIcon />} color={palette.blue} />
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2.5}>
            <SectionCard title="Görünüm" subtitle="Tercihiniz bu tarayıcıda hatırlanır" icon={<PaletteRoundedIcon />} color={palette.violet} fill={false}>
              <Stack direction="row" spacing={1.5}>
                <ThemePreview dark={false} active={mode === "light"} onClick={() => setMode("light")} />
                <ThemePreview dark active={mode === "dark"} onClick={() => setMode("dark")} />
              </Stack>
            </SectionCard>
            <SectionCard title="Hesap bilgileri" icon={<PersonRoundedIcon />} color={palette.teal} fill={false}>
              <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                <Avatar sx={{ width: 56, height: 56, fontWeight: 800, background: gradients.aurora }}>{initials(user?.full_name)}</Avatar>
                <Box>
                  <Typography variant="h6">{user?.full_name}</Typography>
                  <Stack direction="row" spacing={1} mt={0.5}>
                    <Chip size="small" label={user?.role === "ADMIN" ? "Yönetici" : "Kullanıcı"} sx={{ bgcolor: alpha(palette.teal, 0.12), color: palette.teal }} />
                    {user?.is_demo && <Chip size="small" label="Demo hesabı" sx={{ bgcolor: alpha(palette.violet, 0.12), color: palette.violet }} />}
                  </Stack>
                </Box>
              </Stack>
              <Stack spacing={1}>
                {[["E-posta", user?.email], ["Kullanıcı adı", user?.username ?? "—"], ["Son giriş", fmtDateTime(user?.last_login_at)], ["Kayıt tarihi", fmtDateTime(user?.created_at)]].map(([k, v]) => (
                  <Stack key={k} direction="row" justifyContent="space-between" gap={2} sx={{ p: 1.25, borderRadius: 3, bgcolor: (t) => alpha(t.palette.text.primary, 0.03) }}>
                    <Typography color="text.secondary">{k}</Typography><Typography fontWeight={700} sx={{ wordBreak: "break-all" }} textAlign="right">{v}</Typography>
                  </Stack>
                ))}
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <Stack spacing={2.5}>
            <SectionCard title="Şifre değiştir" icon={<LockRoundedIcon />} color={palette.amber} fill={false}>
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
            <SectionCard title="Gizlilik ve güvenlik" icon={<ShieldRoundedIcon />} color={palette.green} fill={false}>
              <Stack spacing={1.25}>
                {["Sağlık verileriniz yalnızca size görünür; yöneticiler sağlık değerlerinizi göremez.",
                  "Oturum anahtarlarınız tarayıcı belleğinde ve güvenli (HttpOnly) çerezde tutulur.",
                  "Verileriniz model eğitimi için kullanılmaz."].map((t) => (
                  <Stack key={t} direction="row" spacing={1.25} alignItems="flex-start">
                    <CheckCircleRoundedIcon sx={{ color: palette.green, fontSize: 20, mt: 0.1 }} />
                    <Typography variant="body2" color="text.secondary">{t}</Typography>
                  </Stack>
                ))}
                <Button variant="outlined" startIcon={<LogoutRoundedIcon />} sx={{ alignSelf: "flex-start", mt: 1, color: palette.coral, borderColor: alpha(palette.coral, 0.5) }}
                  onClick={async () => { await logout(); navigate("/login"); }}>Oturumu kapat</Button>
              </Stack>
            </SectionCard>
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
