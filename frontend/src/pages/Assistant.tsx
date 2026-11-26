import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import ChatBubbleOutlineRoundedIcon from "@mui/icons-material/ChatBubbleOutlineRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HelpOutlineRoundedIcon from "@mui/icons-material/HelpOutlineRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import ScienceRoundedIcon from "@mui/icons-material/ScienceRounded";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import WbSunnyRoundedIcon from "@mui/icons-material/WbSunnyRounded";
import {
  alpha, Avatar, Box, Button, Card, Chip, IconButton, Link, Stack, TextField, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../api/client";
import type { ChatMessage } from "../api/types";
import { useAuth } from "../auth/AuthContext";
import { useNotify } from "../components/AppProviders";
import { errorMessage, fmtDate, IconTile, initials, PageHeader, useAsync } from "../components/common";
import { gradients, palette } from "../theme";

type SessionT = { id: number; title: string; created_at: string };
const SUGGESTIONS = [
  { q: "Genel durumumun özeti nedir?", icon: <InsightsRoundedIcon />, color: palette.teal },
  { q: "Ferritin değerim nasıl?", icon: <ScienceRoundedIcon />, color: palette.coral },
  { q: "D vitamini neden önemli?", icon: <WbSunnyRoundedIcon />, color: palette.amber },
  { q: "Rapor nasıl yüklerim?", icon: <HelpOutlineRoundedIcon />, color: palette.blue },
];

/** Güvenli mini markdown: **kalın** ve [metin](https://...) bağlantıları. HTML enjekte edilmez. */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(m[1] ? <b key={m.index}>{m[1]}</b>
      : <Link key={m.index} href={m[3]} target="_blank" rel="noopener noreferrer" sx={{ color: palette.violet, fontWeight: 600 }}>{m[2]}</Link>);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

function Bubble({ msg, name }: { msg: ChatMessage; name?: string }) {
  const mine = msg.role === "user";
  return (
    <Stack direction={mine ? "row-reverse" : "row"} spacing={1.5} alignItems="flex-end" sx={{ animation: "fadeUp .3s ease" }}>
      <Avatar sx={{ width: 34, height: 34, fontSize: 13, fontWeight: 800, background: mine ? gradients.brand : gradients.violet }}>
        {mine ? initials(name) : <AutoAwesomeRoundedIcon fontSize="small" />}
      </Avatar>
      <Box sx={{ maxWidth: "78%", px: 2.25, py: 1.5, borderRadius: 4, borderBottomRightRadius: mine ? 6 : 16, borderBottomLeftRadius: mine ? 16 : 6,
        background: mine ? `linear-gradient(135deg, ${palette.violet}, ${palette.blue})` : undefined,
        bgcolor: mine ? undefined : (t) => (t.palette.mode === "dark" ? alpha("#fff", 0.06) : "#fff"),
        border: mine ? 0 : 1, borderColor: "divider", color: mine ? "#fff" : "text.primary",
        boxShadow: mine ? `0 8px 20px ${alpha(palette.violet, 0.3)}` : "0 2px 10px rgba(11,21,51,0.05)" }}>
        {msg.content.split("\n").map((line, i) => (
          <Fragment key={i}>{line ? <Typography variant="body2" component="div" lineHeight={1.65}>{renderInline(line)}</Typography> : <Box height={6} />}</Fragment>
        ))}
      </Box>
    </Stack>
  );
}

export default function Assistant() {
  const { user } = useAuth();
  const status = useAsync(() => api<{ configured: boolean; message: string | null }>("/assistant/status"), []);
  const sessions = useAsync(() => api<SessionT[]>("/assistant/sessions"), []);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const notify = useNotify();

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages, busy]);

  const open = async (id: number) => {
    setSessionId(id);
    try {
      setMessages(await api<ChatMessage[]>(`/assistant/sessions/${id}`));
    } catch (e) {
      notify(errorMessage(e), "error");
    }
  };

  const send = async (e?: FormEvent, preset?: string) => {
    e?.preventDefault();
    const message = (preset ?? text).trim();
    if (!message || busy) return;
    setText("");
    setMessages((m) => [...m, { role: "user", content: message }]);
    setBusy(true);
    try {
      const r = await api<{ session_id: number; reply: string }>("/assistant/chat", { method: "POST", body: { message, session_id: sessionId } });
      setMessages((m) => [...m, { role: "assistant", content: r.reply }]);
      if (!sessionId) { setSessionId(r.session_id); sessions.reload(); }
    } catch (err) {
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${errorMessage(err)}` }]);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: number) => {
    await api(`/assistant/sessions/${id}`, { method: "DELETE" }).catch(() => {});
    if (id === sessionId) { setSessionId(null); setMessages([]); }
    sessions.reload();
  };

  const configured = status.data?.configured;
  return (
    <>
      <PageHeader title="Yapay Zekâ Asistanı" eyebrow="Akıllı bilgilendirme" subtitle="Sağlık verileriniz ve uygulama kullanımı hakkında soru sorun."
        icon={<AutoAwesomeRoundedIcon />} color={palette.violet}
        action={status.data && <Chip label={configured ? "Gemini bağlı" : "Yedek mod · kural tabanlı"}
          icon={<Box component="span" sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: configured ? palette.green : palette.amber, ml: "10px !important" }} />}
          sx={{ bgcolor: alpha(configured ? palette.green : palette.amber, 0.12), color: configured ? palette.green : palette.amber }} />} />
      {status.data && !configured && (
        <Stack direction="row" spacing={1.5} alignItems="center" mb={2.5} sx={{ p: 1.75, borderRadius: 4, bgcolor: alpha(palette.amber, 0.08), border: `1px solid ${alpha(palette.amber, 0.25)}` }}>
          <IconTile icon={<AutoAwesomeRoundedIcon />} color={palette.amber} size={34} />
          <Typography variant="body2" color="text.secondary">{status.data.message} Gemini entegrasyonu için sunucudaki <code>.env</code> dosyasına <code>GEMINI_API_KEY</code> eklenmesi yeterlidir.</Typography>
        </Stack>
      )}
      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 3.5 }}>
          <Card sx={{ p: 1.5 }}>
            <Button fullWidth variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setSessionId(null); setMessages([]); }}
              sx={{ background: gradients.violet, boxShadow: `0 8px 20px ${alpha(palette.violet, 0.35)}` }}>Yeni sohbet</Button>
            <Typography variant="overline" color="text.secondary" display="block" px={1} mt={2} mb={0.5}>Geçmiş sohbetler</Typography>
            <Stack spacing={0.5} sx={{ maxHeight: { md: 520 }, overflow: "auto" }}>
              {(sessions.data ?? []).map((s) => {
                const on = s.id === sessionId;
                return (
                  <Stack key={s.id} direction="row" spacing={1.25} alignItems="center" onClick={() => open(s.id)}
                    sx={{ p: 1.1, borderRadius: 3, cursor: "pointer", transition: "all .2s", bgcolor: on ? alpha(palette.violet, 0.12) : "transparent",
                      boxShadow: on ? `inset 0 0 0 1.5px ${alpha(palette.violet, 0.4)}` : "none", "&:hover": { bgcolor: alpha(palette.violet, 0.08), "& .del": { opacity: 1 } } }}>
                    <IconTile icon={<ChatBubbleOutlineRoundedIcon />} color={palette.violet} size={32} />
                    <Box flex={1} minWidth={0}>
                      <Typography fontWeight={700} fontSize={13.5} noWrap>{s.title}</Typography>
                      <Typography variant="caption" color="text.secondary">{fmtDate(s.created_at)}</Typography>
                    </Box>
                    <IconButton className="del" size="small" sx={{ opacity: { md: 0 }, transition: "opacity .2s" }} onClick={(e) => { e.stopPropagation(); remove(s.id); }} aria-label="Sohbeti sil">
                      <DeleteOutlineRoundedIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                );
              })}
              {!sessions.data?.length && <Typography variant="body2" color="text.secondary" p={1.5}>Henüz sohbet yok.</Typography>}
            </Stack>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8.5 }}>
          <Card sx={{ display: "flex", flexDirection: "column", height: { xs: "72vh", md: 660 }, overflow: "hidden",
            backgroundImage: (t) => `radial-gradient(600px 300px at 100% 0%, ${alpha(palette.violet, t.palette.mode === "dark" ? 0.14 : 0.07)}, transparent 70%)` }}>
            <Box flex={1} overflow="auto" p={{ xs: 2, sm: 3 }}>
              {!messages.length ? (
                <Stack alignItems="center" textAlign="center" spacing={2} py={{ xs: 2, md: 5 }} sx={{ animation: "fadeUp .4s ease" }}>
                  <Box position="relative">
                    <Box sx={{ position: "absolute", inset: -18, borderRadius: "50%", background: `radial-gradient(circle, ${alpha(palette.violet, 0.3)}, transparent 70%)` }} />
                    <Avatar sx={{ width: 76, height: 76, background: gradients.violet, boxShadow: `0 12px 30px ${alpha(palette.violet, 0.45)}` }}><AutoAwesomeRoundedIcon sx={{ fontSize: 36 }} /></Avatar>
                  </Box>
                  <Typography variant="h5">Size nasıl yardımcı olabilirim?</Typography>
                  <Typography color="text.secondary" maxWidth={480}>
                    Değerlerinizi analiz motorunun sonuçlarına dayanarak açıklarım ve güvenilir kaynaklara yönlendiririm. Teşhis veya tedavi önermem.
                  </Typography>
                  <Grid container spacing={1.5} maxWidth={560} pt={1}>
                    {SUGGESTIONS.map((s) => (
                      <Grid key={s.q} size={{ xs: 12, sm: 6 }}>
                        <Stack direction="row" spacing={1.25} alignItems="center" onClick={() => send(undefined, s.q)} role="button" tabIndex={0}
                          onKeyDown={(e) => e.key === "Enter" && send(undefined, s.q)}
                          sx={{ p: 1.5, borderRadius: 4, cursor: "pointer", textAlign: "left", border: 1, borderColor: "divider", bgcolor: "background.paper",
                            transition: "all .2s", "&:hover": { borderColor: s.color, transform: "translateY(-2px)", boxShadow: `0 8px 20px ${alpha(s.color, 0.18)}` } }}>
                          <IconTile icon={s.icon} color={s.color} size={34} />
                          <Typography fontWeight={600} fontSize={14}>{s.q}</Typography>
                        </Stack>
                      </Grid>
                    ))}
                  </Grid>
                </Stack>
              ) : (
                <Stack spacing={2.25}>
                  {messages.map((m, i) => <Bubble key={i} msg={m} name={user?.full_name} />)}
                  {busy && (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <Avatar sx={{ width: 34, height: 34, background: gradients.violet }}><AutoAwesomeRoundedIcon fontSize="small" /></Avatar>
                      <Stack direction="row" spacing={0.6} sx={{ px: 2, py: 1.5, borderRadius: 4, bgcolor: (t) => alpha(t.palette.text.primary, 0.05) }}>
                        {[0, 1, 2].map((d) => <Box key={d} sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: palette.violet,
                          animation: `typing 1s ${d * 0.15}s infinite ease-in-out`, "@keyframes typing": { "0%,80%,100%": { opacity: 0.3, transform: "scale(.8)" }, "40%": { opacity: 1, transform: "scale(1)" } } }} />)}
                      </Stack>
                    </Stack>
                  )}
                  <div ref={endRef} />
                </Stack>
              )}
            </Box>
            <Box component="form" onSubmit={send} p={2} borderTop={1} borderColor="divider" sx={{ bgcolor: (t) => alpha(t.palette.background.paper, 0.6) }}>
              <Stack direction="row" spacing={1} alignItems="center">
                <TextField placeholder="Sorunuzu yazın..." value={text} onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: 99, pl: 1 } }} />
                <IconButton type="submit" disabled={busy || !text.trim()} aria-label="Gönder"
                  sx={{ width: 44, height: 44, color: "#fff", background: gradients.violet, boxShadow: `0 6px 16px ${alpha(palette.violet, 0.4)}`,
                    "&:hover": { transform: "scale(1.05)" }, "&.Mui-disabled": { background: alpha(palette.slate, 0.25), color: "#fff", boxShadow: "none" } }}>
                  <SendRoundedIcon fontSize="small" />
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" mt={1} display="block" textAlign="center">
                Asistan yanıtları bilgilendirme amaçlıdır; tıbbi teşhis veya tedavi yerine geçmez. Acil durumlarda 112'yi arayın.
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
