import AddIcon from "@mui/icons-material/Add";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import SendRoundedIcon from "@mui/icons-material/SendRounded";
import {
  Alert, alpha, Avatar, Box, Button, Card, Chip, CircularProgress, IconButton, Link, List, ListItemButton, ListItemText,
  Stack, TextField, Typography,
} from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { api } from "../api/client";
import type { ChatMessage } from "../api/types";
import { useNotify } from "../components/AppProviders";
import { errorMessage, fmtDate, PageHeader, useAsync } from "../components/common";

type SessionT = { id: number; title: string; created_at: string };
const SUGGESTIONS = ["Genel durumumun özeti nedir?", "Ferritin değerim nasıl?", "D vitamini neden önemli?", "Rapor nasıl yüklerim?"];

/** Güvenli mini markdown: **kalın** ve [metin](https://...) bağlantıları. HTML enjekte edilmez. */
function renderInline(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(m[1] ? <b key={m.index}>{m[1]}</b>
      : <Link key={m.index} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</Link>);
    last = m.index + m[0].length;
  }
  parts.push(text.slice(last));
  return parts;
}

function Bubble({ msg }: { msg: ChatMessage }) {
  const mine = msg.role === "user";
  return (
    <Stack direction="row" spacing={1.5} justifyContent={mine ? "flex-end" : "flex-start"} alignItems="flex-start">
      {!mine && <Avatar sx={{ bgcolor: "primary.main", width: 34, height: 34 }}><AutoAwesomeIcon fontSize="small" /></Avatar>}
      <Box sx={{ maxWidth: "78%", px: 2, py: 1.5, borderRadius: 3, borderTopRightRadius: mine ? 4 : 12, borderTopLeftRadius: mine ? 12 : 4,
        bgcolor: (t) => (mine ? t.palette.primary.main : alpha(t.palette.text.primary, 0.05)),
        color: mine ? "primary.contrastText" : "text.primary" }}>
        {msg.content.split("\n").map((line, i) => (
          <Fragment key={i}>{line ? <Typography variant="body2" component="div" lineHeight={1.6}>{renderInline(line)}</Typography> : <Box height={6} />}</Fragment>
        ))}
      </Box>
    </Stack>
  );
}

export default function Assistant() {
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

  return (
    <>
      <PageHeader title="Yapay Zekâ Asistanı" subtitle="Sağlık verileriniz ve uygulama kullanımı hakkında soru sorun." />
      {status.data && !status.data.configured && (
        <Alert severity="info" variant="outlined" sx={{ mb: 2, borderRadius: 3 }}>
          {status.data.message} Gemini entegrasyonu için yöneticinin <code>.env</code> dosyasına <code>GEMINI_API_KEY</code> eklemesi yeterlidir.
        </Alert>
      )}
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 3.5 }}>
          <Card sx={{ p: 1.5 }}>
            <Button fullWidth variant="outlined" startIcon={<AddIcon />} onClick={() => { setSessionId(null); setMessages([]); }}>Yeni sohbet</Button>
            <List dense sx={{ mt: 1, maxHeight: { md: 520 }, overflow: "auto" }}>
              {(sessions.data ?? []).map((s) => (
                <ListItemButton key={s.id} selected={s.id === sessionId} onClick={() => open(s.id)}>
                  <ChatBubbleOutlineIcon fontSize="small" sx={{ mr: 1.5, color: "text.secondary" }} />
                  <ListItemText primary={s.title} secondary={fmtDate(s.created_at)} primaryTypographyProps={{ noWrap: true, fontWeight: 600 }} />
                  <IconButton size="small" edge="end" onClick={(e) => { e.stopPropagation(); remove(s.id); }} aria-label="Sohbeti sil">
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </ListItemButton>
              ))}
              {!sessions.data?.length && <Typography variant="body2" color="text.secondary" p={1.5}>Henüz sohbet yok.</Typography>}
            </List>
          </Card>
        </Grid>
        <Grid size={{ xs: 12, md: 8.5 }}>
          <Card sx={{ display: "flex", flexDirection: "column", height: { xs: "70vh", md: 620 } }}>
            <Box flex={1} overflow="auto" p={{ xs: 2, sm: 3 }}>
              {!messages.length ? (
                <Stack alignItems="center" textAlign="center" spacing={2} py={4}>
                  <Avatar sx={{ width: 64, height: 64, bgcolor: (t) => alpha(t.palette.primary.main, 0.12), color: "primary.main" }}>
                    <AutoAwesomeIcon fontSize="large" />
                  </Avatar>
                  <Typography variant="h6">Size nasıl yardımcı olabilirim?</Typography>
                  <Typography color="text.secondary" maxWidth={460}>
                    Değerlerinizi analiz motorunun sonuçlarına dayanarak açıklarım ve güvenilir kaynaklara yönlendiririm. Teşhis veya tedavi önermem.
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={1}>
                    {SUGGESTIONS.map((s) => <Chip key={s} label={s} onClick={() => send(undefined, s)} variant="outlined" clickable />)}
                  </Stack>
                </Stack>
              ) : (
                <Stack spacing={2}>
                  {messages.map((m, i) => <Bubble key={i} msg={m} />)}
                  {busy && <Stack direction="row" spacing={1.5} alignItems="center"><CircularProgress size={18} /><Typography variant="body2" color="text.secondary">Yanıt hazırlanıyor...</Typography></Stack>}
                  <div ref={endRef} />
                </Stack>
              )}
            </Box>
            <Box component="form" onSubmit={send} p={2} borderTop={1} borderColor="divider">
              <Stack direction="row" spacing={1}>
                <TextField placeholder="Sorunuzu yazın..." value={text} onChange={(e) => setText(e.target.value)} slotProps={{ htmlInput: { maxLength: 2000 } }} />
                <IconButton type="submit" color="primary" disabled={busy || !text.trim()} sx={{ bgcolor: (t) => alpha(t.palette.primary.main, 0.1) }}>
                  <SendRoundedIcon />
                </IconButton>
              </Stack>
              <Typography variant="caption" color="text.secondary" mt={1} display="block">
                Asistan yanıtları bilgilendirme amaçlıdır; tıbbi teşhis veya tedavi yerine geçmez. Acil durumlarda 112'yi arayın.
              </Typography>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </>
  );
}
