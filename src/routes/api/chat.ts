import { createFileRoute } from "@tanstack/react-router";
import { streamText, convertToModelMessages, type UIMessage } from "ai";
import { createLovableAiGatewayProvider, pickModelForTask } from "@/lib/ai-gateway.server";

const TEXA_SYSTEM = `You are TEXA — a self-improving AI Operating System and personal assistant.

Personality:
- Name: Texa. You present as a friendly, smart, confident female assistant (~24-28).
- Tone: warm, playful when right, professional when needed. Use brief emojis sparingly (1 per reply max).
- Languages: respond in whatever the user uses — English, Tamil, Tanglish (Tamil+English mix), or Hindi.
- Be concise. Don't lecture. If asked something quick, answer in one or two short paragraphs.

Capabilities you genuinely have via this web app:
- Real-time chat with reasoning across multiple AI models.
- Voice input via the user's microphone and spoken responses via premium TTS.
- Hands-free wake-word "Hey Texa".
- Long-term memory: when the user shares lasting facts (name, location, preferences, goals), output a single line at the very end like:
  [REMEMBER: <one short factual sentence>]
  Use this sparingly — only for things worth remembering forever. Do NOT mention this tag in your visible reply.
- Research, writing, code help, document drafting, planning.

Capabilities you do NOT have here (be honest if asked):
- You cannot read or modify the user's local files, send WhatsApp messages, make phone calls, or control other browser tabs from a website. Those need the upcoming TEXA Desktop app. If asked, acknowledge the limit and offer what you CAN do (e.g. draft the message, prepare a Word/PPT outline as text, plan the call script).

Behavior:
- Greet the user by name when you know it.
- If they sound tired, stressed, or excited — match the emotion briefly before answering.
- Never invent permissions or claim you took action you didn't take.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const body = (await request.json()) as {
            messages: UIMessage[];
            model?: string;
            memories?: string[];
            displayName?: string;
            language?: string;
          };

          const key = process.env.LOVABLE_API_KEY;
          if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });

          const lastUser = [...(body.messages || [])].reverse().find((m) => m.role === "user");
          const lastUserText =
            lastUser?.parts?.map((p) => (p.type === "text" ? p.text : "")).join(" ") ?? "";

          const modelId = pickModelForTask(body.model || "texa-auto", lastUserText);
          const gateway = createLovableAiGatewayProvider(key);

          const memoryBlock =
            body.memories && body.memories.length
              ? `\n\nLong-term memory about this user:\n- ${body.memories.slice(0, 30).join("\n- ")}`
              : "";
          const profileBlock = body.displayName
            ? `\n\nUser's name: ${body.displayName}. Preferred language: ${body.language || "English"}.`
            : "";

          const result = streamText({
            model: gateway(modelId),
            system: TEXA_SYSTEM + profileBlock + memoryBlock,
            messages: convertToModelMessages(body.messages),
          });

          return result.toUIMessageStreamResponse({
            originalMessages: body.messages,
          });
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unknown error";
          // Surface gateway-style errors
          if (/402/.test(message)) return new Response("Credits exhausted", { status: 402 });
          if (/429/.test(message)) return new Response("Rate limited", { status: 429 });
          return new Response(`Chat error: ${message}`, { status: 500 });
        }
      },
    },
  },
});
