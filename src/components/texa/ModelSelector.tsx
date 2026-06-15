import { AVAILABLE_MODELS } from "@/lib/ai-gateway.server";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Cpu } from "lucide-react";

export function ModelSelector({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[180px] bg-card/60 border-white/10">
        <Cpu className="h-3.5 w-3.5 text-[color:var(--color-neon)] mr-1.5" />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {AVAILABLE_MODELS.map((m) => (
          <SelectItem key={m.id} value={m.id}>
            <div className="flex flex-col">
              <span className="text-sm">{m.label}</span>
              <span className="text-[10px] text-muted-foreground">
                {m.provider} · {m.description}
              </span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
