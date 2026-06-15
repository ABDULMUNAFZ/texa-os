import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createConversation,
  listConversations,
} from "@/lib/texa.functions";
import { Sidebar } from "@/components/texa/Sidebar";
import { ChatPanel } from "@/components/texa/ChatPanel";
import { DynamicIsland, type IslandState } from "@/components/texa/DynamicIsland";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PermissionCenter } from "@/components/texa/PermissionCenter";
import { MemoryPanel } from "@/components/texa/MemoryPanel";
import { SettingsPanel } from "@/components/texa/SettingsPanel";
import { Toaster } from "@/components/ui/sonner";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Texa — Your AI Operating System" },
      { name: "description", content: "Chat, voice, hands-free, and memory powered by Texa." },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  const qc = useQueryClient();
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const { data: convos } = useQuery({ queryKey: ["conversations"], queryFn: () => list() });

  const [activeId, setActiveId] = useState<string | null>(null);
  const [island, setIsland] = useState<IslandState>({ kind: "idle" });
  const [permOpen, setPermOpen] = useState(false);
  const [memOpen, setMemOpen] = useState(false);
  const [setOpen, setSetOpen] = useState(false);
  const [handsFree, setHandsFree] = useState(false);

  // Auto-pick first convo or create one
  useEffect(() => {
    if (activeId) return;
    if (convos === undefined) return;
    if (convos.length > 0) {
      setActiveId(convos[0].id);
    } else {
      (async () => {
        const c = await create({ data: { title: "New conversation" } });
        qc.invalidateQueries({ queryKey: ["conversations"] });
        if (c) setActiveId(c.id);
      })();
    }
  }, [convos, activeId, create, qc]);

  return (
    <div className="h-screen w-screen flex bg-background overflow-hidden">
      <DynamicIsland state={island} />
      <Sidebar
        activeId={activeId}
        onSelect={setActiveId}
        onOpenPermissions={() => setPermOpen(true)}
        onOpenMemory={() => setMemOpen(true)}
        onOpenSettings={() => setSetOpen(true)}
      />
      <main className="flex-1 flex flex-col min-w-0 relative">
        <div className="absolute inset-0 grid-bg pointer-events-none" />
        <div className="relative flex-1 flex flex-col min-h-0">
          {activeId ? (
            <ChatPanel
              key={activeId}
              conversationId={activeId}
              onIslandChange={setIsland}
              handsFree={handsFree}
              setHandsFree={setHandsFree}
            />
          ) : (
            <div className="flex-1 grid place-items-center text-muted-foreground text-sm">
              Loading…
            </div>
          )}
        </div>
      </main>

      <Sheet open={permOpen} onOpenChange={setPermOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] glass-strong border-l border-white/10">
          <SheetHeader>
            <SheetTitle>Permission Center</SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-1">
            <PermissionCenter />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={memOpen} onOpenChange={setMemOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] glass-strong border-l border-white/10">
          <SheetHeader>
            <SheetTitle>Memory</SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-1">
            <MemoryPanel />
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={setOpen} onOpenChange={setSetOpen}>
        <SheetContent className="w-[400px] sm:w-[440px] glass-strong border-l border-white/10">
          <SheetHeader>
            <SheetTitle>Settings</SheetTitle>
          </SheetHeader>
          <div className="mt-4 px-1">
            <SettingsPanel />
          </div>
        </SheetContent>
      </Sheet>

      <Toaster theme="dark" />
    </div>
  );
}
