import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import BarChartRoundedIcon from "@mui/icons-material/BarChartRounded";
import DarkModeRoundedIcon from "@mui/icons-material/DarkModeRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import FavoriteRoundedIcon from "@mui/icons-material/FavoriteRounded";
import FolderSharedRoundedIcon from "@mui/icons-material/FolderSharedRounded";
import GridViewRoundedIcon from "@mui/icons-material/GridViewRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import KeyboardDoubleArrowLeftRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowLeftRounded";
import KeyboardDoubleArrowRightRoundedIcon from "@mui/icons-material/KeyboardDoubleArrowRightRounded";
import LightModeRoundedIcon from "@mui/icons-material/LightModeRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import MenuRoundedIcon from "@mui/icons-material/MenuRounded";
import MonitorHeartRoundedIcon from "@mui/icons-material/MonitorHeartRounded";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SettingsRoundedIcon from "@mui/icons-material/SettingsRounded";
import {
  alpha, AppBar, Avatar, Box, Chip, Divider, Drawer, IconButton, ListItemIcon, Menu, MenuItem, Stack, Switch, Toolbar,
  Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { gradients, palette } from "../theme";
import { useColorMode } from "./AppProviders";
import { initials } from "./common";
import Logo from "./Logo";

const FULL = 272;
const MINI = 88;

type NavItem = { to: string; label: string; icon: ReactNode; color: string };

const userNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <GridViewRoundedIcon />, color: palette.teal },
  { to: "/profile", label: "Sağlık Profilim", icon: <FavoriteRoundedIcon />, color: palette.coral },
  { to: "/records", label: "Sağlık Verilerim", icon: <FolderSharedRoundedIcon />, color: palette.blue },
  { to: "/measurements", label: "Ölçümlerim", icon: <MonitorHeartRoundedIcon />, color: palette.pink },
  { to: "/reports", label: "Raporlarım", icon: <DescriptionRoundedIcon />, color: palette.amber },
  { to: "/analysis", label: "Analizler", icon: <InsightsRoundedIcon />, color: palette.green },
  { to: "/assistant", label: "Yapay Zekâ Asistanı", icon: <AutoAwesomeRoundedIcon />, color: palette.violet },
  { to: "/settings", label: "Ayarlar", icon: <SettingsRoundedIcon />, color: palette.slate },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Yönetici Dashboard", icon: <AdminPanelSettingsRoundedIcon />, color: palette.teal },
  { to: "/admin/users", label: "Kullanıcı Yönetimi", icon: <PeopleAltRoundedIcon />, color: palette.blue },
  { to: "/admin/logs", label: "Sistem Logları", icon: <ReceiptLongRoundedIcon />, color: palette.amber },
  { to: "/admin/stats", label: "Sistem İstatistikleri", icon: <BarChartRoundedIcon />, color: palette.violet },
  { to: "/settings", label: "Ayarlar", icon: <SettingsRoundedIcon />, color: palette.slate },
];

export default function Layout() {
  const theme = useTheme();
  const desktop = useMediaQuery(theme.breakpoints.up("md"));
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuEl, setMenuEl] = useState<HTMLElement | null>(null);
  const { user, logout } = useAuth();
  const { mode, toggle } = useColorMode();
  const navigate = useNavigate();
  const location = useLocation();
  const isAdmin = user?.role === "ADMIN";
  const compact = desktop && collapsed;
  const dense = isAdmin; // yönetici menüsü daha uzun: daha sıkı aralık
  const width = compact ? MINI : FULL;

  const sections = isAdmin
    ? [{ title: "Yönetim", items: adminNav }, { title: "Kişisel", items: userNav.filter((i) => i.to !== "/settings") }]
    : [{ title: "Sağlık", items: userNav.slice(0, 6) }, { title: "Araçlar", items: userNav.slice(6) }];
  const current = sections.flatMap((s) => s.items).sort((a, b) => b.to.length - a.to.length)
    .find((i) => (i.to === "/" ? location.pathname === "/" : location.pathname.startsWith(i.to)));
  const doLogout = async () => { setMenuEl(null); await logout(); navigate("/login"); };

  // Sidebar her iki temada da derin lacivert: ana içerikten net biçimde ayrılır.
  const drawer = (
    <Stack height="100%" py={2.5} px={compact ? 1.5 : 2} sx={{ background: gradients.sidebar, color: "#fff", position: "relative", overflow: "hidden" }}>
      <Box sx={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", top: -120, right: -140,
        background: "radial-gradient(circle, rgba(45,212,191,0.25), transparent 65%)", pointerEvents: "none" }} />
      <Box sx={{ position: "absolute", width: 260, height: 260, borderRadius: "50%", bottom: -60, left: -150,
        background: "radial-gradient(circle, rgba(139,92,246,0.25), transparent 65%)", pointerEvents: "none" }} />
      <Stack direction="row" alignItems="center" justifyContent="space-between" px={compact ? 0 : 0.5} position="relative">
        <Logo compact={compact} light />
      </Stack>

      <Box flex={1} overflow="auto" mt={dense ? 2.5 : 3.5} position="relative" sx={{ "&::-webkit-scrollbar-thumb": { background: alpha("#fff", 0.15) } }}>
        {sections.map((s) => (
          <Box key={s.title} mb={2}>
            {compact ? <Divider sx={{ borderColor: alpha("#fff", 0.08), my: 1 }} /> : (
              <Typography variant="overline" sx={{ px: 1.5, color: alpha("#fff", 0.4), display: "block", mb: 0.5 }}>{s.title}</Typography>
            )}
            {s.items.map((item) => {
              const active = current?.to === item.to;
              const link = (
                <Box key={item.to} component={NavLink} to={item.to} end={item.to === "/"} onClick={() => setMobileOpen(false)}
                  sx={{
                    display: "flex", alignItems: "center", gap: 1.5, px: compact ? 0 : 1.25, py: dense ? 0.6 : 1, mb: 0.5, borderRadius: 3.5,
                    justifyContent: compact ? "center" : "flex-start", textDecoration: "none", position: "relative",
                    color: active ? "#fff" : alpha("#fff", 0.68), fontWeight: active ? 700 : 500, fontSize: 14.5,
                    background: active ? `linear-gradient(90deg, ${alpha(item.color, 0.35)}, ${alpha(item.color, 0.08)})` : "transparent",
                    boxShadow: active ? `inset 0 0 0 1px ${alpha(item.color, 0.35)}` : "none",
                    transition: "all .2s ease",
                    "&:hover": { color: "#fff", background: active ? undefined : alpha("#fff", 0.06), "& .nav-ico": { transform: "scale(1.06)" } },
                  }}>
                  <Box className="nav-ico" sx={{ width: dense ? 32 : 36, height: dense ? 32 : 36, borderRadius: 2.5, display: "grid", placeItems: "center", flexShrink: 0,
                    transition: "transform .2s ease",
                    color: active ? "#fff" : item.color,
                    background: active ? `linear-gradient(135deg, ${item.color}, ${alpha(item.color, 0.65)})` : alpha(item.color, 0.14),
                    boxShadow: active ? `0 6px 16px ${alpha(item.color, 0.5)}` : "none", "& svg": { fontSize: 20 } }}>
                    {item.icon}
                  </Box>
                  {!compact && <Box component="span" sx={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{item.label}</Box>}
                </Box>
              );
              return compact ? <Tooltip key={item.to} title={item.label} placement="right">{link}</Tooltip> : link;
            })}
          </Box>
        ))}
      </Box>

      {/* Tema anahtarı */}
      <Stack direction="row" alignItems="center" justifyContent={compact ? "center" : "space-between"} position="relative"
        sx={{ px: compact ? 0 : 1.5, py: 1, mb: 1.25, borderRadius: 3.5, bgcolor: alpha("#fff", 0.05) }}>
        {!compact && <Stack direction="row" spacing={1} alignItems="center" sx={{ color: alpha("#fff", 0.75) }}>
          {mode === "dark" ? <DarkModeRoundedIcon fontSize="small" /> : <LightModeRoundedIcon fontSize="small" />}
          <Typography variant="body2" fontWeight={600}>{mode === "dark" ? "Koyu tema" : "Açık tema"}</Typography>
        </Stack>}
        {compact ? (
          <IconButton onClick={toggle} sx={{ color: "#fff" }}>{mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}</IconButton>
        ) : <Switch checked={mode === "dark"} onChange={toggle} size="small" inputProps={{ "aria-label": "Koyu tema" }} />}
      </Stack>

      {/* Kullanıcı profil alanı */}
      <Stack direction="row" alignItems="center" spacing={1.25} position="relative" justifyContent={compact ? "center" : "flex-start"}
        sx={{ p: compact ? 0.5 : 1.25, borderRadius: 3.5, background: compact ? "none" : `linear-gradient(135deg, ${alpha("#fff", 0.09)}, ${alpha("#fff", 0.03)})`,
          border: compact ? 0 : `1px solid ${alpha("#fff", 0.08)}` }}>
        <Avatar sx={{ width: 40, height: 40, fontWeight: 800, fontSize: 15, background: gradients.aurora }}>{initials(user?.full_name)}</Avatar>
        {!compact && <>
          <Box minWidth={0} flex={1}>
            <Typography fontWeight={700} fontSize={14} noWrap>{user?.full_name}</Typography>
            <Typography fontSize={12} sx={{ color: alpha("#fff", 0.55) }} noWrap>{isAdmin ? "Yönetici" : "Kullanıcı"}{user?.is_demo ? " · Demo" : ""}</Typography>
          </Box>
          <Tooltip title="Çıkış yap"><IconButton size="small" onClick={doLogout} sx={{ color: alpha("#fff", 0.7), "&:hover": { color: palette.coral } }}>
            <LogoutRoundedIcon fontSize="small" /></IconButton></Tooltip>
        </>}
      </Stack>
    </Stack>
  );

  const paperSx = { width, boxSizing: "border-box" as const, border: 0, bgcolor: "#0B1533", transition: "width .25s ease", overflowX: "hidden" as const };

  return (
    <Box display="flex" minHeight="100vh">
      {desktop ? (
        <Drawer variant="permanent" sx={{ width, flexShrink: 0, transition: "width .25s ease", "& .MuiDrawer-paper": paperSx }}>{drawer}</Drawer>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { ...paperSx, width: FULL } }}>{drawer}</Drawer>
      )}

      <Box flex={1} minWidth={0} display="flex" flexDirection="column">
        <AppBar position="sticky" color="inherit" sx={{ bgcolor: alpha(theme.palette.background.default, 0.72), backdropFilter: "saturate(180%) blur(14px)",
          borderBottom: `1px solid ${theme.palette.divider}`, boxShadow: "none" }}>
          <Toolbar sx={{ gap: 1, minHeight: { xs: 64, md: 72 } }}>
            {desktop ? (
              <Tooltip title={collapsed ? "Menüyü genişlet" : "Menüyü daralt"}>
                <IconButton onClick={() => setCollapsed(!collapsed)} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                  {collapsed ? <KeyboardDoubleArrowRightRoundedIcon /> : <KeyboardDoubleArrowLeftRoundedIcon />}
                </IconButton>
              </Tooltip>
            ) : <IconButton onClick={() => setMobileOpen(true)}><MenuRoundedIcon /></IconButton>}
            <Stack direction="row" sx={{ ml: 0.5, bgcolor: alpha(theme.palette.text.primary, 0.05), borderRadius: 3 }}>
              <Tooltip title="Geri"><IconButton size="small" onClick={() => navigate(-1)}><ArrowBackRoundedIcon fontSize="small" /></IconButton></Tooltip>
              <Tooltip title="İleri"><IconButton size="small" onClick={() => navigate(1)}><ArrowForwardRoundedIcon fontSize="small" /></IconButton></Tooltip>
            </Stack>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ ml: 1, flex: 1, minWidth: 0 }}>
              {current && <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: current.color, boxShadow: `0 0 0 4px ${alpha(current.color, 0.2)}` }} />}
              <Typography fontWeight={700} noWrap>{current?.label ?? ""}</Typography>
            </Stack>
            {user?.is_demo && <Chip size="small" label="Demo ortamı · Sentetik veri"
              sx={{ display: { xs: "none", sm: "flex" }, bgcolor: alpha(palette.violet, 0.12), color: palette.violet }} />}
            <Tooltip title={mode === "dark" ? "Açık tema" : "Koyu tema"}>
              <IconButton onClick={toggle} sx={{ bgcolor: alpha(theme.palette.text.primary, 0.05) }}>
                {mode === "dark" ? <LightModeRoundedIcon /> : <DarkModeRoundedIcon />}
              </IconButton>
            </Tooltip>
            <IconButton onClick={(e) => setMenuEl(e.currentTarget)} sx={{ p: 0.25 }} aria-label="Hesap menüsü">
              <Avatar sx={{ width: 38, height: 38, fontSize: 14, fontWeight: 800, background: gradients.aurora }}>{initials(user?.full_name)}</Avatar>
            </IconButton>
            <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)} slotProps={{ paper: { sx: { borderRadius: 4, minWidth: 240, mt: 1 } } }}
              transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }}>
              <Box px={2} py={1.25}>
                <Typography fontWeight={800}>{user?.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
              </Box>
              <Divider sx={{ my: 0.5 }} />
              <MenuItem onClick={() => { setMenuEl(null); navigate("/settings"); }}>
                <ListItemIcon><SettingsRoundedIcon fontSize="small" /></ListItemIcon>Ayarlar
              </MenuItem>
              <MenuItem onClick={doLogout} sx={{ color: palette.coral }}>
                <ListItemIcon sx={{ color: "inherit" }}><LogoutRoundedIcon fontSize="small" /></ListItemIcon>Çıkış yap
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        {/* key: her sayfa değişiminde yumuşak giriş animasyonu */}
        <Box component="main" key={location.pathname}
          sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1480, width: "100%", mx: "auto", animation: "fadeUp .35s ease" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
