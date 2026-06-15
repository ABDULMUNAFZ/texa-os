import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  createConversation,
  deleteConversation,
  listConversations,
} from "@/lib/texa.functions";
import { Button } from "@/components/ui/button";
import { MessageSquarePlus, Trash2, Settings, LogOut, Shield, Brain } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "@tanstack/react-router";

export function Sidebar({
  activeId,
  onSelect,
  onOpenPermissions,
  onOpenMemory,
  onOpenSettings,
}: {
  activeId: string | null;
  onSelect: (id: string) => void;
  onOpenPermissions: () => void;
  onOpenMemory: () => void;
  onOpenSettings: () => void;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const del = useServerFn(deleteConversation);

  const { data } = useQuery({ queryKey: ["conversations"], queryFn: () => list() });
  const createMut = useMutation({
    mutationFn: () => create({ data: { title: "New conversation" } }),
    onSuccess: (row) => {
      qc.invalidateQueries({ queryKey: ["conversations"] });
      if (row) onSelect(row.id);
    },
  });
  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["conversations"] }),
  });

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  return (
    <aside className="h-full w-[260px] shrink-0 glass-strong border-r border-white/5 flex flex-col">
      <div className="p-3">
        <Button onClick={() => createMut.mutate()} className="w-full btn-hero">
          <MessageSquarePlus className="h-4 w-4 mr-2" /> New chat
        </Button>
      </div>
      <div className="flex-1 overflow-y-auto px-2 space-y-1">
        {data?.map((c) => (
          <div
            key={c.id}
            className={`group flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition ${
              activeId === c.id
                ? "bg-[color:var(--color-primary)]/15 border border-[color:var(--color-primary)]/30"
                : "hover:bg-white/5"
            }`}
            onClick={() => onSelect(c.id)}
          >
            <span className="text-sm truncate flex-1">{c.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                delMut.mutate(c.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition"
              title="Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
        {(!data || data.length === 0) && (
          <div className="text-xs text-muted-foreground px-2 py-4 text-center">
            No conversations yet
          </div>
        )}
      </div>
      <div className="p-2 border-t border-white/5 grid grid-cols-2 gap-1">
        <Button variant="ghost" size="sm" onClick={onOpenMemory}>
          <Brain className="h-4 w-4 mr-1.5" /> Memory
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenPermissions}>
          <Shield className="h-4 w-4 mr-1.5" /> Access
        </Button>
        <Button variant="ghost" size="sm" onClick={onOpenSettings}>
          <Settings className="h-4 w-4 mr-1.5" /> Settings
        </Button>
        <Button variant="ghost" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-1.5" /> Sign out
        </Button>
      </div>
    </aside>
  );
}
