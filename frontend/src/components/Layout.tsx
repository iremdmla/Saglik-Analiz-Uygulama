import AdminPanelSettingsOutlinedIcon from "@mui/icons-material/AdminPanelSettingsOutlined";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import AutoAwesomeOutlinedIcon from "@mui/icons-material/AutoAwesomeOutlined";
import BarChartOutlinedIcon from "@mui/icons-material/BarChartOutlined";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import FolderSharedOutlinedIcon from "@mui/icons-material/FolderSharedOutlined";
import InsightsOutlinedIcon from "@mui/icons-material/InsightsOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import MenuIcon from "@mui/icons-material/Menu";
import MenuOpenIcon from "@mui/icons-material/MenuOpen";
import MonitorHeartOutlinedIcon from "@mui/icons-material/MonitorHeartOutlined";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import {
  alpha, AppBar, Avatar, Box, Chip, Divider, Drawer, IconButton, List, ListItemButton, ListItemIcon, ListItemText,
  ListSubheader, Menu, MenuItem, Stack, Toolbar, Tooltip, Typography, useMediaQuery, useTheme,
} from "@mui/material";
import { useState, type ReactNode } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { useColorMode } from "./AppProviders";

const FULL = 264;
const MINI = 80;

type NavItem = { to: string; label: string; icon: ReactNode };

const userNav: NavItem[] = [
  { to: "/", label: "Dashboard", icon: <DashboardOutlinedIcon /> },
  { to: "/profile", label: "Sağlık Profilim", icon: <FavoriteBorderIcon /> },
  { to: "/records", label: "Sağlık Verilerim", icon: <FolderSharedOutlinedIcon /> },
  { to: "/measurements", label: "Ölçümlerim", icon: <MonitorHeartOutlinedIcon /> },
  { to: "/reports", label: "Raporlarım", icon: <DescriptionOutlinedIcon /> },
  { to: "/analysis", label: "Analizler", icon: <InsightsOutlinedIcon /> },
  { to: "/assistant", label: "Yapay Zekâ Asistanı", icon: <AutoAwesomeOutlinedIcon /> },
  { to: "/settings", label: "Ayarlar", icon: <SettingsOutlinedIcon /> },
];

const adminNav: NavItem[] = [
  { to: "/admin", label: "Yönetici Dashboard", icon: <AdminPanelSettingsOutlinedIcon /> },
  { to: "/admin/users", label: "Kullanıcı Yönetimi", icon: <PeopleOutlineIcon /> },
  { to: "/admin/logs", label: "Sistem Logları", icon: <ReceiptLongOutlinedIcon /> },
  { to: "/admin/stats", label: "Sistem İstatistikleri", icon: <BarChartOutlinedIcon /> },
  { to: "/settings", label: "Ayarlar", icon: <SettingsOutlinedIcon /> },
];

function Brand({ compact }: { compact: boolean }) {
  return (
    <Stack direction="row" spacing={1.5} alignItems="center" px={compact ? 0 : 1} justifyContent={compact ? "center" : "flex-start"}>
      <Box component="img" src="/favicon.svg" alt="" sx={{ width: 36, height: 36 }} />
      {!compact && (
        <Box>
          <Typography fontWeight={800} lineHeight={1.1}>HealthTrack</Typography>
          <Typography variant="caption" color="primary.main" fontWeight={700}>AI · Sağlık Takibi</Typography>
        </Box>
      )}
    </Stack>
  );
}

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
  const width = compact ? MINI : FULL;

  const sections: { title: string; items: NavItem[] }[] = isAdmin
    ? [{ title: "Yönetim", items: adminNav }, { title: "Kişisel", items: userNav.filter((i) => i.to !== "/settings") }]
    : [{ title: "Menü", items: userNav }];
  const allItems = sections.flatMap((s) => s.items);
  const current = [...allItems].sort((a, b) => b.to.length - a.to.length)
    .find((i) => (i.to === "/" ? location.pathname === "/" : location.pathname.startsWith(i.to)));

  const drawer = (
    <Stack height="100%" py={2.5} px={compact ? 1.25 : 2}>
      <Brand compact={compact} />
      <Box flex={1} overflow="auto" mt={3}>
        {sections.map((s) => (
          <List key={s.title} dense subheader={!compact ? (
            <ListSubheader disableSticky sx={{ bgcolor: "transparent", lineHeight: "32px", fontWeight: 700,
              fontSize: 11, letterSpacing: "0.08em", textTransform: "uppercase" }}>{s.title}</ListSubheader>
          ) : <Divider sx={{ my: 1 }} />}>
            {s.items.map((item) => {
              const active = current?.to === item.to;
              const btn = (
                <ListItemButton key={item.to} component={NavLink} to={item.to} end={item.to === "/"}
                  onClick={() => setMobileOpen(false)}
                  sx={{
                    mb: 0.5, py: 1.1, justifyContent: compact ? "center" : "flex-start",
                    color: active ? "primary.main" : "text.secondary",
                    bgcolor: active ? alpha(theme.palette.primary.main, 0.12) : "transparent",
                    position: "relative",
                    "&::before": active ? { content: '""', position: "absolute", left: -8, top: 8, bottom: 8, width: 4,
                      borderRadius: 4, bgcolor: "primary.main" } : undefined,
                    "&:hover": { bgcolor: alpha(theme.palette.primary.main, active ? 0.16 : 0.06) },
                  }}>
                  <ListItemIcon sx={{ minWidth: compact ? 0 : 40, color: "inherit" }}>{item.icon}</ListItemIcon>
                  {!compact && <ListItemText primary={item.label}
                    primaryTypographyProps={{ fontWeight: active ? 700 : 500, fontSize: 14.5 }} />}
                </ListItemButton>
              );
              return compact ? <Tooltip key={item.to} title={item.label} placement="right">{btn}</Tooltip> : btn;
            })}
          </List>
        ))}
      </Box>
      {!compact && (
        <Box sx={{ p: 2, borderRadius: 3, bgcolor: alpha(theme.palette.secondary.main, 0.08), mt: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block">
            Bu uygulama bilgilendirme amaçlıdır; teşhis veya tedavi yerine geçmez.
          </Typography>
        </Box>
      )}
    </Stack>
  );

  const paperSx = { width, boxSizing: "border-box" as const, borderRight: `1px solid ${theme.palette.divider}`,
    bgcolor: "background.paper", transition: "width .2s ease", overflowX: "hidden" as const };

  return (
    <Box display="flex" minHeight="100vh">
      {desktop ? (
        <Drawer variant="permanent" sx={{ width, flexShrink: 0, transition: "width .2s ease", "& .MuiDrawer-paper": paperSx }}>
          {drawer}
        </Drawer>
      ) : (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)} ModalProps={{ keepMounted: true }}
          sx={{ "& .MuiDrawer-paper": { ...paperSx, width: FULL } }}>
          {drawer}
        </Drawer>
      )}

      <Box flex={1} minWidth={0} display="flex" flexDirection="column">
        <AppBar position="sticky" color="inherit" sx={{ bgcolor: alpha(theme.palette.background.default, 0.8),
          backdropFilter: "blur(12px)", borderBottom: `1px solid ${theme.palette.divider}` }}>
          <Toolbar sx={{ gap: 1 }}>
            <Tooltip title={desktop ? (collapsed ? "Menüyü genişlet" : "Menüyü daralt") : "Menü"}>
              <IconButton edge="start" onClick={() => (desktop ? setCollapsed(!collapsed) : setMobileOpen(true))}>
                {desktop && !collapsed ? <MenuOpenIcon /> : <MenuIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title="Geri"><IconButton size="small" onClick={() => navigate(-1)}><ArrowBackIcon fontSize="small" /></IconButton></Tooltip>
            <Tooltip title="İleri"><IconButton size="small" onClick={() => navigate(1)}><ArrowForwardIcon fontSize="small" /></IconButton></Tooltip>
            <Typography fontWeight={700} noWrap sx={{ ml: 1, flex: 1 }}>{current?.label ?? ""}</Typography>
            {user?.is_demo && <Chip size="small" color="secondary" variant="outlined" label="Demo ortamı"
              sx={{ display: { xs: "none", sm: "flex" } }} />}
            <Tooltip title={mode === "dark" ? "Açık tema" : "Koyu tema"}>
              <IconButton onClick={toggle}>{mode === "dark" ? <LightModeOutlinedIcon /> : <DarkModeOutlinedIcon />}</IconButton>
            </Tooltip>
            <IconButton onClick={(e) => setMenuEl(e.currentTarget)} sx={{ p: 0.5 }}>
              <Avatar sx={{ width: 36, height: 36, bgcolor: "primary.main", fontSize: 15, fontWeight: 700 }}>
                {user?.full_name.split(" ").map((p) => p[0]).slice(0, 2).join("")}
              </Avatar>
            </IconButton>
            <Menu anchorEl={menuEl} open={!!menuEl} onClose={() => setMenuEl(null)}
              transformOrigin={{ horizontal: "right", vertical: "top" }} anchorOrigin={{ horizontal: "right", vertical: "bottom" }}>
              <Box px={2} py={1}>
                <Typography fontWeight={700}>{user?.full_name}</Typography>
                <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
                <Chip size="small" sx={{ mt: 1 }} label={isAdmin ? "Yönetici" : "Kullanıcı"} color={isAdmin ? "secondary" : "primary"} />
              </Box>
              <Divider sx={{ my: 1 }} />
              <MenuItem onClick={() => { setMenuEl(null); navigate("/settings"); }}>
                <ListItemIcon><SettingsOutlinedIcon fontSize="small" /></ListItemIcon>Ayarlar
              </MenuItem>
              <MenuItem onClick={async () => { setMenuEl(null); await logout(); navigate("/login"); }}>
                <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>Çıkış yap
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box component="main" sx={{ p: { xs: 2, sm: 3, lg: 4 }, maxWidth: 1440, width: "100%", mx: "auto" }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
}
