import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listMessages,
  saveMessage,
  listMemories,
  addMemory,
  getMyProfile,
} from "@/lib/texa.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  FileText,
  Mic,
  MicOff,
  Send,
  Square,
  Volume2,
  VolumeX,
  XCircle,
} from "lucide-react";
import { ModelSelector } from "./ModelSelector";
import { MessageContent } from "./MessageContent";
import {
  containsWakeWord,
  getSpeechRecognition,
  speak,
  speechSupported,
  stripWakeWord,
} from "@/lib/texa-voice";
import type { PlaybackHandle } from "@/lib/texa-voice";
import { toast } from "sonner";
import type { IslandState } from "./DynamicIsland";

type Msg = { id: string; role: "user" | "assistant"; content: string; created_at?: string };
type PendingAction =
  | { kind: "open_url"; title: string; description: string; url: string }
  | { kind: "web_search"; title: string; description: string; query: string }
  | { kind: "copy_text"; title: string; description: string; text: string }
  | { kind: "pick_files"; title: string; description: string }
  | { kind: "notify"; title: string; description: string; text: string; delayMs: number };

const SITE_URLS: Record<string, string> = {
  google: "https://google.com",
  youtube: "https://youtube.com",
  gmail: "https://mail.google.com",
  whatsapp: "https://web.whatsapp.com",
  instagram: "https://instagram.com",
  github: "https://github.com",
  linkedin: "https://linkedin.com",
};

function inferPendingAction(text: string): PendingAction | null {
  const raw = text.trim();
  const lower = raw.toLowerCase();
  const urlMatch = raw.match(/https?:\/\/[^\s]+/i);
  if (/\b(open|launch|go to|visit)\b/i.test(raw)) {
    const namedSite = Object.keys(SITE_URLS).find((site) => lower.includes(site));
    const url = urlMatch?.[0] || (namedSite ? SITE_URLS[namedSite] : null);
    if (url) {
      return {
        kind: "open_url",
        title: `Open ${namedSite ? namedSite[0].toUpperCase() + namedSite.slice(1) : "link"}`,
        description: "Ready to open this in a new browser tab.",
        url,
      };
    }
  }
  const whatsAppMatch = raw.match(/(?:whatsapp|message)\s+(.+)/i);
  if (whatsAppMatch && lower.includes("whatsapp")) {
    return {
      kind: "open_url",
      title: "Prepare WhatsApp message",
      description: "Ready to open WhatsApp with this message drafted. You press send there.",
      url: `https://wa.me/?text=${encodeURIComponent(whatsAppMatch[1].trim())}`,
    };
  }
  const searchMatch = raw.match(/(?:search|google|research|find)\s+(?:for\s+)?(.+)/i);
  if (searchMatch) {
    const query = searchMatch[1].trim();
    return {
      kind: "web_search",
      title: "Search the web",
      description: `Ready to search for “${query}”.`,
      query,
    };
  }
  const copyMatch = raw.match(/copy\s+(.+)/i);
  if (copyMatch) {
    return {
      kind: "copy_text",
      title: "Copy text",
      description: "Ready to copy this to your clipboard.",
      text: copyMatch[1].trim(),
    };
  }
  if (/\b(read|open|analyse|analyze|summari[sz]e|check)\b/i.test(raw) && /\b(file|files|document|pdf|txt|doc)\b/i.test(raw)) {
    return {
      kind: "pick_files",
      title: "Access files",
      description: "Ready to ask permission and read files you choose from this device.",
    };
  }
  const reminderMatch = raw.match(/remind me to\s+(.+?)\s+in\s+(\d+)\s*(second|seconds|minute|minutes|hour|hours)/i);
  if (reminderMatch) {
    const amount = Number(reminderMatch[2]);
    const unit = reminderMatch[3].toLowerCase();
    const multiplier = unit.startsWith("second") ? 1000 : unit.startsWith("minute") ? 60_000 : 3_600_000;
    return {
      kind: "notify",
      title: "Set reminder",
      description: `Ready to remind you in ${amount} ${unit}.`,
      text: reminderMatch[1].trim(),
      delayMs: amount * multiplier,
    };
  }
  return null;
}

export function ChatPanel({
  conversationId,
  onIslandChange,
  handsFree,
  setHandsFree,
}: {
  conversationId: string;
  onIslandChange: (s: IslandState) => void;
  handsFree: boolean;
  setHandsFree: (v: boolean) => void;
}) {
  const qc = useQueryClient();
  const listMsgs = useServerFn(listMessages);
  const save = useServerFn(saveMessage);
  const listMem = useServerFn(listMemories);
  const addMem = useServerFn(addMemory);
  const getProfile = useServerFn(getMyProfile);

  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: memories } = useQuery({ queryKey: ["memories"], queryFn: () => listMem() });
  const { data: serverMsgs } = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: () => listMsgs({ data: { conversationId } }),
  });

  const [messages, setMessages] = useState<Msg[]>([]);
  const [streaming, setStreaming] = useState<string>("");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [model, setModel] = useState("texa-auto");
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const audioRef = useRef<PlaybackHandle | null>(null);
  const recRef = useRef<ReturnType<typeof getSpeechRecognition>>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

  useEffect(() => {
    if (serverMsgs) setMessages(serverMsgs as Msg[]);
  }, [serverMsgs]);

  useEffect(() => {
    if (profile?.preferred_model) setModel(profile.preferred_model);
    if (profile && profile.voice_enabled === false) setVoiceOn(false);
  }, [profile]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const addMemMut = useMutation({
    mutationFn: (content: string) => addMem({ data: { content } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["memories"] }),
  });
  const saveMut = useMutation({
    mutationFn: (v: { role: "user" | "assistant"; content: string }) =>
      save({ data: { conversationId, ...v } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  async function sendText(text: string, skipActionInference = false) {
    if (!text.trim() || sending) return;
    const proposedAction = skipActionInference ? null : inferPendingAction(text);
    if (proposedAction) setPendingAction(proposedAction);
    const userMsg: Msg = { id: crypto.randomUUID(), role: "user", content: text };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setSending(true);
    setStreaming("");
    onIslandChange({ kind: "thinking", label: "Texa is thinking…" });
    saveMut.mutate({ role: "user", content: text });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const uiMessages = [...messages, userMsg].map((m) => ({
        id: m.id,
        role: m.role,
        parts: [{ type: "text" as const, text: m.content }],
      }));

      abortRef.current = new AbortController();
      const r = await fetch("/api/chat", {
        method: "POST",
        signal: abortRef.current.signal,
        headers: {
          "Content-Type": "application/json",
          ...(session ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({
          messages: uiMessages,
          model,
          memories: (memories ?? []).map((m) => m.content),
          displayName: profile?.display_name ?? undefined,
          language: profile?.preferred_language ?? "english",
          pendingAction: proposedAction
            ? { title: proposedAction.title, description: proposedAction.description }
            : undefined,
        }),
      });
      if (!r.ok || !r.body) {
        if (r.status === 402) toast.error("AI credits exhausted. Add credits to continue.");
        else if (r.status === 429) toast.error("Slow down — rate limited.");
        else toast.error(`Chat error (${r.status})`);
        setSending(false);
        onIslandChange({ kind: "idle" });
        return;
      }

      // Parse UI message stream (SSE: lines starting with `data: { type, ... }`)
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let assistantText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith("data:")) continue;
          const json = line.slice(5).trim();
          if (!json || json === "[DONE]") continue;
          try {
            const evt = JSON.parse(json) as { type?: string; delta?: string; text?: string };
            if (evt.type === "text-delta" && typeof evt.delta === "string") {
              assistantText += evt.delta;
              setStreaming(assistantText);
              onIslandChange({ kind: "thinking", label: "Streaming…" });
            } else if (evt.type === "error" && typeof evt.text === "string") {
              throw new Error(evt.text);
            }
          } catch {
            /* ignore non-JSON keepalives */
          }
        }
      }

      // Extract [REMEMBER: ...] tag, store it, then strip for display
      const memRegex = /\[REMEMBER:\s*([^\]]+)\]/gi;
      const memMatches = [...assistantText.matchAll(memRegex)];
      for (const m of memMatches) {
        const content = m[1].trim();
        if (content) addMemMut.mutate(content);
      }
      const displayText = assistantText.replace(memRegex, "").trim();
      const fallbackText = proposedAction
        ? `I analysed that task. Confirm it below and I’ll execute: ${proposedAction.title}.`
        : "I’m online. Tell me what you want done next.";

      const assistantMsg: Msg = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: displayText || fallbackText,
      };
      setMessages((m) => [...m, assistantMsg]);
      setStreaming("");
      saveMut.mutate({ role: "assistant", content: assistantMsg.content });

      onIslandChange({ kind: "idle" });
      if (handsFree) startListening(true);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        toast.info("Stopped");
      } else {
        console.error(err);
        toast.error("Something went wrong");
      }
      onIslandChange({ kind: "idle" });
    } finally {
      setSending(false);
    }
  }

  function stop() {
    abortRef.current?.abort();
    audioRef.current?.pause();
    audioRef.current = null;
    setSending(false);
    onIslandChange({ kind: "idle" });
  }

  async function executePendingAction() {
    if (!pendingAction) return;
    onIslandChange({ kind: "task", label: pendingAction.title });
    try {
      if (pendingAction.kind === "open_url") {
        window.open(pendingAction.url, "_blank", "noopener,noreferrer");
      } else if (pendingAction.kind === "web_search") {
        window.open(`https://www.google.com/search?q=${encodeURIComponent(pendingAction.query)}`, "_blank", "noopener,noreferrer");
      } else if (pendingAction.kind === "copy_text") {
        await navigator.clipboard.writeText(pendingAction.text);
        toast.success("Copied");
      } else if (pendingAction.kind === "pick_files") {
        fileInputRef.current?.click();
      } else if (pendingAction.kind === "notify") {
        const showReminder = () => new Notification("Texa reminder", { body: pendingAction.text });
        if (Notification.permission === "granted") {
          window.setTimeout(showReminder, pendingAction.delayMs);
        } else {
          const permission = await Notification.requestPermission();
          if (permission !== "granted") throw new Error("Notification permission denied");
          window.setTimeout(showReminder, pendingAction.delayMs);
        }
        toast.success("Reminder armed");
      }
      setPendingAction(null);
    } catch (err) {
      toast.error((err as Error).message || "Task blocked by the browser");
    } finally {
      onIslandChange({ kind: "idle" });
      if (handsFree) startListening(true);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setPendingAction(null);
    const snippets = await Promise.all(
      Array.from(files).slice(0, 5).map(async (file) => {
        const text = await file.text().catch(() => "[could not read as text]");
        return `File: ${file.name}\n${text.slice(0, 12000)}`;
      }),
    );
    sendText(`Analyse these selected files and help me with the task:\n\n${snippets.join("\n\n---\n\n")}`, true);
  }

  // -------- voice recognition --------
  const supportsSR = useMemo(() => speechSupported(), []);

  function startListening(viaWake = false) {
    if (!supportsSR) {
      toast.error("Voice not supported in this browser. Try Chrome.");
      return;
    }
    if (listening) return;
    const rec = getSpeechRecognition();
    if (!rec) return;
    recRef.current = rec;
    rec.continuous = handsFree;
    rec.interimResults = true;
    let finalText = "";
    rec.onresult = (e) => {
      let interimText = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        const t = r[0]?.transcript ?? "";
        if (r.isFinal) finalText += t + " ";
        else interimText += t;
      }
      setInterim((finalText + interimText).trim());
      onIslandChange({ kind: "listening", transcript: (finalText + interimText).slice(-40) });

      // hands-free: detect wake word, then capture rest until pause
      if (handsFree && !viaWake) {
        if (containsWakeWord(finalText + interimText)) {
          const cmd = stripWakeWord(finalText + interimText);
          if (cmd.length > 4 && finalText) {
            stopListening();
            sendText(cmd);
          }
        }
      }
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => {
      setListening(false);
      if (handsFree && !sending) {
        const text = stripWakeWord(finalText.trim());
        setInterim("");
        if (text.length > 2) sendText(text);
        else setTimeout(() => startListening(true), 400);
      } else if (!handsFree && finalText.trim()) {
        const text = finalText.trim();
        setInterim("");
        sendText(text);
      }
    };
    try {
      rec.start();
      setListening(true);
      onIslandChange({ kind: "listening" });
    } catch {
      /* already started */
    }
  }
  function stopListening() {
    recRef.current?.stop();
    recRef.current = null;
    setListening(false);
    setInterim("");
  }

  useEffect(() => {
    if (handsFree) startListening(true);
    else stopListening();
    return () => stopListening();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [handsFree]);

  return (
    <div className="flex flex-col h-full">
      {/* header */}
      <div className="flex items-center gap-2 p-3 border-b border-white/5">
        <ModelSelector value={model} onChange={setModel} />
        <div className="flex-1" />
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setVoiceOn((v) => !v)}
          title={voiceOn ? "Mute voice" : "Unmute voice"}
        >
          {voiceOn ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </Button>
        <Button
          variant={handsFree ? "default" : "ghost"}
          size="sm"
          onClick={() => setHandsFree(!handsFree)}
          className={handsFree ? "btn-hero" : ""}
        >
          {handsFree ? "Hands-free ON" : "Hands-free"}
        </Button>
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="h-full grid place-items-center text-center">
            <div className="max-w-md space-y-3 animate-fade-up">
              <div className="text-xl font-semibold">
                Hello{profile?.display_name ? ` ${profile.display_name.split(" ")[0]}` : ""}, I'm Texa.
              </div>
              <p className="text-sm text-muted-foreground">
                Ask me anything. Press the mic for voice, or turn on Hands-free and say
                <span className="text-[color:var(--color-neon)] font-medium"> "Hey Texa"</span>.
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  "What's the weather today?",
                  "Draft a study plan for AI Agents",
                  "Remember my name is Abdul",
                  "I'm tired, cheer me up",
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => sendText(s)}
                    className="text-xs px-3 py-1.5 rounded-full glass hover:border-[color:var(--color-neon)]/50 transition"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streaming && (
          <MessageBubble
            message={{ id: "streaming", role: "assistant", content: streaming }}
            streaming
          />
        )}
        {pendingAction && (
          <div className="max-w-lg glass-strong neon-border rounded-2xl p-3 animate-fade-up">
            <div className="text-sm font-medium">{pendingAction.title}</div>
            <div className="text-xs text-muted-foreground mt-1">{pendingAction.description}</div>
            <div className="flex gap-2 mt-3">
              <Button size="sm" className="btn-hero" onClick={executePendingAction}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" /> Confirm
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setPendingAction(null)}>
                <XCircle className="h-4 w-4 mr-1.5" /> Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <div className="p-3 border-t border-white/5">
        {interim && (
          <div className="text-xs text-muted-foreground mb-2 px-3 italic">
            {interim}
          </div>
        )}
        <div className="glass rounded-2xl p-2 flex items-end gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.currentTarget.files)}
          />
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask Texa anything…"
            className="border-0 bg-transparent resize-none min-h-[44px] max-h-40 focus-visible:ring-0"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendText(input);
              }
            }}
          />
          <Button
            variant="ghost"
            size="icon"
            className={listening ? "text-[color:var(--color-neon)]" : ""}
            onClick={() => (listening ? stopListening() : startListening())}
            title="Voice input"
          >
            {listening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </Button>
          {sending ? (
            <Button onClick={stop} variant="destructive" size="icon" title="Stop">
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={() => sendText(input)}
              disabled={!input.trim()}
              size="icon"
              className="btn-hero"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ message, streaming }: { message: Msg; streaming?: boolean }) {
  const isUser = message.role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} animate-fade-up`}>
      {!isUser && (
        <div className="h-8 w-8 rounded-full mr-2 grid place-items-center text-[10px] font-bold text-[color:var(--color-neon)] glass shrink-0">
          T
        </div>
      )}
      <div
        className={
          isUser
            ? "max-w-[80%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm bg-[color:var(--color-primary)] text-[color:var(--color-primary-foreground)]"
            : "max-w-[80%] rounded-2xl rounded-bl-md px-4 py-2.5 text-sm text-foreground"
        }
      >
        <div className="break-words">
          <MessageContent text={message.content} />
          {streaming && (
            <span className="inline-block w-1.5 h-3.5 align-middle ml-0.5 bg-[color:var(--color-neon)] animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}
