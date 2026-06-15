import { createFileRoute, Link } from "@tanstack/react-router";
import { Orb } from "@/components/texa/Orb";
import { DynamicIsland } from "@/components/texa/DynamicIsland";
import { Button } from "@/components/ui/button";
import {
  Mic,
  MessageSquare,
  Brain,
  Search,
  FileText,
  Presentation,
  PhoneCall,
  Globe,
  Calendar,
  Plane,
  Shield,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TEXA — Self-Improving AI Operating System" },
      {
        name: "description",
        content:
          "TEXA is a futuristic AI operating system. Think, speak, act, learn — chat, voice, hands-free, with real long-term memory.",
      },
      { property: "og:title", content: "TEXA — Your AI Operating System" },
      { property: "og:description", content: "Think. Speak. Act. Learn." },
      { property: "og:type", content: "website" },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  { icon: MessageSquare, title: "Chat assistant", desc: "Multi-model reasoning with GPT, Gemini & more." },
  { icon: Mic, title: "Voice assistant", desc: "Premium realistic voice via ElevenLabs." },
  { icon: Sparkles, title: "Hands-free mode", desc: "Wake word: \"Hey Texa\". No keyboard needed." },
  { icon: Brain, title: "Long-term memory", desc: "Remembers your name, goals & preferences." },
  { icon: Search, title: "Research agent", desc: "Search, summarize and cite at scale." },
  { icon: FileText, title: "Document drafting", desc: "Word, Markdown, briefs and outlines." },
  { icon: Presentation, title: "Presentation help", desc: "Build slide outlines with structure." },
  { icon: Plane, title: "Travel planner", desc: "Itineraries, packing, local tips." },
  { icon: Calendar, title: "Personal assistant", desc: "Schedules, drafts and reminders." },
  { icon: Globe, title: "Browser agent", desc: "Coming with TEXA Desktop." },
  { icon: PhoneCall, title: "Calls & WhatsApp", desc: "Coming with TEXA Desktop." },
  { icon: Shield, title: "Permission Center", desc: "You approve every access — mic, files, etc." },
];

function Landing() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <DynamicIsland state={{ kind: "idle" }} />
      <div className="absolute inset-0 grid-bg pointer-events-none" />

      {/* Nav */}
      <nav className="relative z-10 max-w-7xl mx-auto flex items-center justify-between p-5">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-lg grid place-items-center" style={{ background: "var(--gradient-neon)" }}>
            <span className="text-sm font-bold text-[color:var(--color-primary-foreground)]">T</span>
          </div>
          <span className="font-semibold tracking-wide">TEXA</span>
          <span className="text-[10px] uppercase tracking-widest text-muted-foreground border border-white/10 rounded-full px-2 py-0.5 ml-1">v1.0</span>
        </div>
        <div className="flex gap-2">
          <Link to="/auth"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/app"><Button size="sm" className="btn-hero">Launch Texa</Button></Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 pt-12 pb-24 text-center">
        <div className="mx-auto" style={{ width: 340, height: 340 }}>
          <Orb size={340} />
        </div>
        <h1 className="mt-6 text-5xl sm:text-7xl font-semibold tracking-tight">
          <span className="text-gradient">TEXA</span>
        </h1>
        <p className="mt-3 text-xl sm:text-2xl font-medium">
          Your Self-Improving AI Operating System
        </p>
        <p className="mt-3 text-base text-muted-foreground">
          Think. Speak. Act. Learn.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app">
            <Button size="lg" className="btn-hero">
              <Mic className="h-4 w-4 mr-2" /> Start Talking
            </Button>
          </Link>
          <Link to="/auth">
            <Button size="lg" variant="outline" className="border-white/15 bg-white/5 backdrop-blur">
              Launch Texa
            </Button>
          </Link>
        </div>

        {/* Greeting card */}
        <div className="mt-12 max-w-md mx-auto glass-strong neon-border rounded-2xl p-5 text-left">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-[color:var(--color-neon)] animate-pulse" />
            Texa · speaking
          </div>
          <div className="text-sm leading-relaxed">
            <span className="opacity-70">"Hello,</span> I'm Texa.<br/>
            <span className="opacity-70">How can I help you today?"</span>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="relative z-10 max-w-7xl mx-auto px-5 pb-24">
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-semibold">One brain. Many layers.</h2>
          <p className="text-muted-foreground mt-2">Built like an operating system, not a chatbot.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {FEATURES.map((f, i) => (
            <div
              key={f.title}
              className="glass rounded-2xl p-5 hover:border-[color:var(--color-neon)]/40 transition group animate-fade-up"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div
                className="h-10 w-10 rounded-xl grid place-items-center mb-3 group-hover:scale-110 transition"
                style={{ background: "oklch(0.72 0.22 240 / 0.15)", border: "1px solid oklch(0.72 0.22 240 / 0.3)" }}
              >
                <f.icon className="h-5 w-5 text-[color:var(--color-neon)]" />
              </div>
              <div className="font-medium">{f.title}</div>
              <div className="text-sm text-muted-foreground mt-1">{f.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Dynamic Island showcase */}
      <section className="relative z-10 max-w-5xl mx-auto px-5 pb-24">
        <div className="text-center mb-8">
          <h2 className="text-3xl sm:text-4xl font-semibold">Live status, always.</h2>
          <p className="text-muted-foreground mt-2">A floating Dynamic Island shows what Texa is doing.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "Idle", body: "TEXA" },
            { label: "Listening", body: "🎙 ▂▅▇▆▃▂▆▇▅▂" },
            { label: "Thinking", body: "⚡ Streaming…" },
            { label: "Task", body: "🔍 Researching · 47 sources" },
          ].map((s) => (
            <div key={s.label} className="glass-strong rounded-2xl p-5 text-center">
              <div className="text-xs uppercase tracking-widest text-muted-foreground mb-3">{s.label}</div>
              <div className="inline-block glass rounded-full px-5 py-2 text-sm">{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 max-w-3xl mx-auto px-5 pb-24 text-center">
        <div className="glass-strong neon-border rounded-3xl p-10">
          <h3 className="text-3xl font-semibold">Ready to meet Texa?</h3>
          <p className="text-muted-foreground mt-2 mb-6">Free to try with your Lovable Cloud account.</p>
          <Link to="/auth"><Button size="lg" className="btn-hero">Get started</Button></Link>
        </div>
      </section>

      <footer className="relative z-10 text-center text-xs text-muted-foreground pb-10">
        TEXA v1.0 · Powered by Lovable AI & ElevenLabs
      </footer>
    </div>
  );
}
