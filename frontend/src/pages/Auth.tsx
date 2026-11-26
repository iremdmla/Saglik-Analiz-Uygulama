import FavoriteIcon from "@mui/icons-material/Favorite";
import InsightsIcon from "@mui/icons-material/Insights";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";
import {
  Alert, alpha, Box, Button, Card, Chip, CircularProgress, IconButton, InputAdornment, Link, Stack, TextField,
  Typography, useTheme,
} from "@mui/material";
import { useState, type FormEvent, type ReactNode } from "react";
import { Link as RouterLink, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { errorMessage } from "../components/common";

const DEMO_ACCOUNTS = [
  { label: "Yönetici", id: "admin" },
  { label: "Ayşe Demir", id: "ayse@healthtrack.local" },
  { label: "Mehmet Yılmaz", id: "mehmet@healthtrack.local" },
  { label: "Elif Kaya", id: "elif@healthtrack.local" },
];

function AuthShell({ children }: { children: ReactNode }) {
  const theme = useTheme();
  const features = [
    { icon: <FavoriteIcon />, title: "Tüm sağlık verileriniz tek yerde", text: "Tahliller, tansiyon, kilo ve yaşam tarzı ölçümleri." },
    { icon: <InsightsIcon />, title: "Anlaşılır analizler", text: "Referans aralıkları ve zaman içindeki değişim grafikleri." },
    { icon: <ShieldOutlinedIcon />, title: "Gizlilik öncelikli", text: "Verileriniz yalnızca size aittir ve izole saklanır." },
  ];
  return (
    <Box minHeight="100vh" display="grid" gridTemplateColumns={{ xs: "1fr", md: "1.05fr 1fr" }} bgcolor="background.default">
      <Box sx={{
        display: { xs: "none", md: "flex" }, flexDirection: "column", justifyContent: "space-between", p: 6, color: "#fff",
        background: `radial-gradient(circle at 20% 20%, ${alpha("#2ED3B7", 0.55)}, transparent 45%),
                     radial-gradient(circle at 80% 80%, ${alpha("#6172F3", 0.6)}, transparent 50%), #0B2A3A`,
      }}>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Box component="img" src="/favicon.svg" sx={{ width: 40 }} />
          <Typography variant="h6" fontWeight={800}>HealthTrack AI</Typography>
        </Stack>
        <Box maxWidth={480}>
          <Typography variant="h3" fontWeight={800} lineHeight={1.15} letterSpacing="-0.03em">
            Sağlığınızı verilerle anlayın.
          </Typography>
          <Typography mt={2} sx={{ opacity: 0.8 }} fontSize={17}>
            Yapay zekâ destekli kişisel sağlık verisi takibi, analizi ve akıllı bilgilendirme sistemi.
          </Typography>
          <Stack spacing={2.5} mt={5}>
            {features.map((f) => (
              <Stack key={f.title} direction="row" spacing={2} alignItems="flex-start">
                <Box sx={{ p: 1.2, borderRadius: 2.5, bgcolor: alpha("#fff", 0.12), display: "flex" }}>{f.icon}</Box>
                <Box>
                  <Typography fontWeight={700}>{f.title}</Typography>
                  <Typography variant="body2" sx={{ opacity: 0.75 }}>{f.text}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
        <Typography variant="caption" sx={{ opacity: 0.6 }}>
          Bilgilendirme amaçlıdır; teşhis ve tedavi yerine geçmez.
        </Typography>
      </Box>
      <Stack justifyContent="center" alignItems="center" p={{ xs: 2, sm: 4 }}>
        <Card sx={{ width: "100%", maxWidth: 440, p: { xs: 3, sm: 4 }, boxShadow: theme.palette.mode === "light" ? "0 20px 60px rgba(16,24,40,.08)" : "none" }}>
          {children}
        </Card>
      </Stack>
    </Box>
  );
}

function PasswordField({ value, onChange, label = "Şifre", autoComplete }: {
  value: string; onChange: (v: string) => void; label?: string; autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <TextField label={label} type={show ? "text" : "password"} value={value} required autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)} size="medium"
      slotProps={{ input: { endAdornment: (
        <InputAdornment position="end">
          <IconButton onClick={() => setShow(!show)} edge="end" aria-label="Şifreyi göster/gizle">
            {show ? <VisibilityOff /> : <Visibility />}
          </IconButton>
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
      <Box sx={{ width: 48, height: 48, borderRadius: 3, display: "grid", placeItems: "center", bgcolor: "primary.main", color: "primary.contrastText", mb: 2 }}>
        <LockOutlinedIcon />
      </Box>
      <Typography variant="h5">Tekrar hoş geldiniz</Typography>
      <Typography color="text.secondary" mb={3}>Hesabınıza giriş yapın.</Typography>
      <Stack component="form" spacing={2} onSubmit={submit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="E-posta veya kullanıcı adı" value={identifier} required size="medium" autoComplete="username"
          onChange={(e) => setIdentifier(e.target.value)} autoFocus />
        <PasswordField value={password} onChange={setPassword} autoComplete="current-password" />
        <Button type="submit" variant="contained" size="large" disabled={busy}>
          {busy ? <CircularProgress size={22} color="inherit" /> : "Giriş yap"}
        </Button>
      </Stack>
      <Typography mt={3} textAlign="center" color="text.secondary">
        Hesabınız yok mu? <Link component={RouterLink} to="/register" fontWeight={600}>Kayıt olun</Link>
      </Typography>
      <Box mt={3} p={2} borderRadius={3} bgcolor={(t) => alpha(t.palette.secondary.main, 0.07)}>
        <Typography variant="caption" fontWeight={700} color="secondary.main">DEMO HESAPLARI (SENTETİK VERİ)</Typography>
        <Stack direction="row" flexWrap="wrap" gap={1} mt={1}>
          {DEMO_ACCOUNTS.map((a) => (
            <Chip key={a.id} label={a.label} size="small" onClick={() => setIdentifier(a.id)} variant="outlined" />
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary" display="block" mt={1}>
          Şifreler .env dosyasında tanımlıdır (README'ye bakınız).
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
  const weak = form.password.length > 0 && (form.password.length < 8 || !/\d/.test(form.password) || !/[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(form.password));
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
      <Typography variant="h5">Hesap oluşturun</Typography>
      <Typography color="text.secondary" mb={3}>Sağlık verilerinizi takip etmeye başlayın.</Typography>
      <Stack component="form" spacing={2} onSubmit={submit}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField label="Ad Soyad" value={form.full_name} required size="medium" inputProps={{ minLength: 2, maxLength: 120 }}
          onChange={(e) => set("full_name")(e.target.value)} autoComplete="name" />
        <TextField label="E-posta" type="email" value={form.email} required size="medium" autoComplete="email"
          onChange={(e) => set("email")(e.target.value)} />
        <PasswordField value={form.password} onChange={set("password")} autoComplete="new-password" />
        {weak && <Typography variant="caption" color="error">En az 8 karakter, bir harf ve bir rakam içermeli.</Typography>}
        <PasswordField label="Şifre (tekrar)" value={form.confirm} onChange={set("confirm")} autoComplete="new-password" />
        {mismatch && <Typography variant="caption" color="error">Şifreler eşleşmiyor.</Typography>}
        <Button type="submit" variant="contained" size="large" disabled={busy || weak || mismatch}>
          {busy ? <CircularProgress size={22} color="inherit" /> : "Kayıt ol"}
        </Button>
      </Stack>
      <Typography mt={3} textAlign="center" color="text.secondary">
        Zaten hesabınız var mı? <Link component={RouterLink} to="/login" fontWeight={600}>Giriş yapın</Link>
      </Typography>
    </AuthShell>
  );
}
