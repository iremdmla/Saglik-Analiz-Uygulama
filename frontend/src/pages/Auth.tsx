import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import ShieldRoundedIcon from "@mui/icons-material/ShieldRounded";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  Alert, alpha, Avatar, Box, Button, Card, CircularProgress, IconButton, InputAdornment, Link, Stack, TextField, Typography,
} from "@mui/material";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useColorMode } from "../components/AppProviders";
import { errorMessage, initials } from "../components/common";
import Logo from "../components/Logo";
import { gradients, palette } from "../theme";

const DEMO_ACCOUNTS = [
  { label: "Yönetici", sub: "admin", id: "admin", color: palette.violet },
  { label: "Ayşe Demir", sub: "Demir takibi", id: "ayse@healthtrack.local", color: palette.coral },
  { label: "Mehmet Yılmaz", sub: "Prediyabet", id: "mehmet@healthtrack.local", color: palette.blue },
  { label: "Elif Kaya", sub: "Tiroid", id: "elif@healthtrack.local", color: palette.teal },
];

const FEATURES = [
  { icon: <MonitorHeartRoundedIcon />, color: palette.teal, title: "Tüm sağlık verileriniz tek yerde", text: "Tahliller, tansiyon, kilo, uyku ve aktivite ölçümleri." },
  { icon: <InsightsRoundedIcon />, color: palette.lavender, title: "Anlaşılır analizler", text: "Referans aralıkları, trendler ve tarih karşılaştırmaları." },
  { icon: <AutoAwesomeRoundedIcon />, color: "#FDBA74", title: "Yapay zekâ asistanı", text: "Kaynak gösteren, teşhis koymayan akıllı bilgilendirme." },
  { icon: <ShieldRoundedIcon />, color: "#86EFAC", title: "Gizlilik öncelikli", text: "Verileriniz şifreli oturumlarla yalnızca size açık." },
];

function AuthShell({ children }: { children: ReactNode }) {
  const { mode, toggle } = useColorMode();
  return (
    <Box minHeight="100vh" display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.1fr 1fr" }}>
      <Box sx={{ display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "space-between", p: { md: 5, lg: 7 },
        color: "#fff", position: "relative", overflow: "hidden", background: gradients.hero }}>
        <Box sx={{ position: "absolute", width: 520, height: 520, borderRadius: "50%", right: -180, top: -200, background: "radial-gradient(circle, rgba(255,255,255,0.16), transparent 65%)" }} />
        <Box sx={{ position: "absolute", width: 460, height: 460, borderRadius: "50%", left: -160, bottom: -200, background: "radial-gradient(circle, rgba(139,92,246,0.45), transparent 65%)" }} />
        {/* dekoratif nabız çizgisi */}
        <Box component="svg" viewBox="0 0 600 120" sx={{ position: "absolute", left: 0, right: 0, bottom: "9%", width: "100%", opacity: 0.16 }}>
          <path d="M0 60 H180 L210 20 L245 100 L275 40 L295 60 H600" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </Box>
        <Box position="relative"><Logo light /></Box>
        <Box position="relative" maxWidth={520}>
          <Typography variant="overline" sx={{ color: "#5EEAD4" }}>Kişisel sağlık platformu</Typography>
          <Typography variant="h3" sx={{ fontSize: { md: 40, lg: 48 }, lineHeight: 1.08, mt: 1 }}>
            Sağlığınızı <Box component="span" sx={{ background: "linear-gradient(90deg,#5EEAD4,#C4B5FD)", WebkitBackgroundClip: "text", color: "transparent" }}>verilerle</Box> anlayın.
          </Typography>
          <Typography mt={2} sx={{ opacity: 0.8 }} fontSize={17}>
            Yapay zekâ destekli kişisel sağlık verisi analizi, takibi ve akıllı bilgilendirme sistemi.
          </Typography>
          <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1.5} mt={4}>
            {FEATURES.map((f) => (
              <Box key={f.title} sx={{ p: 2, borderRadius: 4, bgcolor: alpha("#fff", 0.08), border: `1px solid ${alpha("#fff", 0.12)}`, backdropFilter: "blur(8px)",
                transition: "transform .25s", "&:hover": { transform: "translateY(-3px)" } }}>
                <Box sx={{ color: f.color, display: "flex", mb: 1 }}>{f.icon}</Box>
                <Typography fontWeight={700} fontSize={14.5}>{f.title}</Typography>
                <Typography variant="body2" sx={{ opacity: 0.7 }}>{f.text}</Typography>
              </Box>
            ))}
          </Box>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.6, position: "relative" }}>Bilgilendirme amaçlıdır; teşhis ve tedavi yerine geçmez.</Typography>
      </Box>
      <Stack justifyContent="center" alignItems="center" p={{ xs: 2, sm: 4 }} position="relative">
        <IconButton onClick={toggle} sx={{ position: "absolute", top: 16, right: 16, bgcolor: (t) => alpha(t.palette.text.primary, 0.05) }} aria-label="Tema değiştir">
          {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
        </IconButton>
        <Box sx={{ display: { xs: "block", md: "none" }, mb: 3 }}><Logo /></Box>
        <Card sx={{ width: "100%", maxWidth: 460, p: { xs: 3, sm: 4.5 }, animation: "fadeUp .4s ease",
          boxShadow: (t) => (t.palette.mode === "light" ? "0 30px 80px rgba(11,21,51,0.12)" : undefined) }}>
          {children}
        </Card>
      </Stack>
    </Box>
  );
}

function PasswordField({ value, onChange, label = "Şifre", autoComplete }: { value: string; onChange: (v: string) => void; label?: string; autoComplete: string }) {
  const [show, setShow] = useState(false);
  return (
    <TextField label={label} type={show ? "text" : "password"} value={value} required autoComplete={autoComplete} size="medium"
      onChange={(e) => onChange(e.target.value)}
      slotProps={{ input: { endAdornment: (
        <InputAdornment position="end">
          <IconButton onClick={() => setShow(!show)} edge="end" aria-label="Şifreyi göster/gizle">{show ? <VisibilityOff /> : <Visibility />}</IconButton>
        </InputAdornment>
      ) } }} />
  );
}

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const u = await login(identifier, password);
      navigate(u.role === "ADMIN" ? "/admin" : "/", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <Typography variant="h4">Tekrar hoş geldiniz 👋</Typography>
      <Typography color="text.secondary" mt={0.75} mb={3.5}>Sağlık panonuza erişmek için giriş yapın.</Typography>
      <Stack component="form" spacing={2} onSubmit={submit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="E-posta veya kullanıcı adı" value={identifier} required size="medium" autoComplete="username"
          onChange={(e) => setIdentifier(e.target.value)} autoFocus />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <Button type="submit" variant="contained" size="large" disabled={busy} sx={{ py: 1.4 }}>
          {busy ? <CircularProgress size={22} color="inherit" /> : "Giriş yap"}
        </Button>
      </Stack>
      <Typography mt={2.5} textAlign="center" color="text.secondary">
        Hesabınız yok mu? <Link component={RouterLink} to="/register" fontWeight={700}>Kayıt olun</Link>
      </Typography>
      <Box mt={3.5}>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <Box flex={1} height="1px" bgcolor="divider" />
          <Typography variant="overline" color="text.secondary">Demo hesapları · sentetik veri</Typography>
          <Box flex={1} height="1px" bgcolor="divider" />
        </Stack>
        <Box display="grid" gridTemplateColumns="1fr 1fr" gap={1}>
          {DEMO_ACCOUNTS.map((a) => {
            const active = identifier === a.id;
            return (
              <Stack key={a.id} direction="row" spacing={1.25} alignItems="center" onClick={() => setIdentifier(a.id)} role="button" tabIndex={0}
                onKeyDown={(e) => e.key === "Enter" && setIdentifier(a.id)}
                sx={{ p: 1.1, borderRadius: 3, cursor: "pointer", transition: "all .2s", border: `1.5px solid ${active ? a.color : "transparent"}`,
                  bgcolor: alpha(a.color, active ? 0.12 : 0.06), "&:hover": { bgcolor: alpha(a.color, 0.12) } }}>
                <Avatar sx={{ width: 32, height: 32, fontSize: 12, fontWeight: 800, background: `linear-gradient(135deg, ${a.color}, ${alpha(a.color, 0.6)})` }}>{initials(a.label)}</Avatar>
                <Box minWidth={0}>
                  <Typography fontWeight={700} fontSize={13} noWrap>{a.label}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">{a.sub}</Typography>
                </Box>
              </Stack>
            );
          })}
        </Box>
        <Typography variant="caption" color="text.secondary" display="block" mt={1.25} textAlign="center">
          Hesaba tıklayın, şifreyi girin. Şifreler README dosyasında yer alır.
        </Typography>
      </Box>
    </AuthShell>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "", confirm: "" });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof form) => (v: string) => setForm({ ...form, [k]: v });
  const checks = [
    { ok: form.password.length >= 8, label: "En az 8 karakter" },
    { ok: /[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(form.password), label: "Harf" },
    { ok: /\d/.test(form.password), label: "Rakam" },
  ];
  const strength = checks.filter((c) => c.ok).length;
  const weak = form.password.length > 0 && strength < 3;
  const mismatch = form.confirm.length > 0 && form.confirm !== form.password;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (weak || mismatch) return;
    setBusy(true);
    setError("");
    try {
      await register(form.full_name, form.email, form.password);
      navigate("/profile", { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell>
      <Typography variant="h4">Hesap oluşturun</Typography>
      <Typography color="text.secondary" mt={0.75} mb={3.5}>Sağlık verilerinizi takip etmeye birkaç saniyede başlayın.</Typography>
      <Stack component="form" spacing={2} onSubmit={submit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Ad Soyad" value={form.full_name} required size="medium" slotProps={{ htmlInput: { minLength: 2, maxLength: 120 } }}
          onChange={(e) => set("full_name")(e.target.value)} autoComplete="name" />
        <TextField label="E-posta" type="email" value={form.email} required size="medium" autoComplete="email" onChange={(e) => set("email")(e.target.value)} />
        <PasswordField value={form.password} onChange={set("password")} autoComplete="new-password" />
        {form.password && (
          <Box>
            <Stack direction="row" spacing={0.75} mb={0.75}>
              {[0, 1, 2].map((i) => (
                <Box key={i} flex={1} height={5} borderRadius={9} sx={{ transition: "background .3s",
                  bgcolor: i < strength ? [palette.coral, palette.amber, palette.green][strength - 1] : alpha(palette.slate, 0.2) }} />
              ))}
            </Stack>
            <Stack direction="row" spacing={1.5}>
              {checks.map((c) => <Typography key={c.label} variant="caption" sx={{ color: c.ok ? palette.green : "text.secondary", fontWeight: 600 }}>{c.ok ? "✓" : "•"} {c.label}</Typography>)}
            </Stack>
          </Box>
        )}
        <PasswordField label="Şifre (tekrar)" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
        {mismatch && <Typography variant="caption" color="error">Şifreler eşleşmiyor.</Typography>}
        <Button type="submit" variant="contained" size="large" disabled={busy || weak || mismatch} sx={{ py: 1.4 }}>
          {busy ? <CircularProgress size={22} color="inherit" /> : "Kayıt ol"}
        </Button>
      </Stack>
      <Typography mt={2.5} textAlign="center" color="text.secondary">
        Zaten hesabınız var mı? <Link component={RouterLink} to="/login" fontWeight={700}>Giriş yapın</Link>
      </Typography>
    </AuthShell>
  );
}
