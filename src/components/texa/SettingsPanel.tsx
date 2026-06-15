import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMyProfile, updateMyProfile } from "@/lib/texa.functions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

const LANGUAGES = ["English", "Tamil", "Tanglish", "Hindi"];

export function SettingsPanel() {
  const qc = useQueryClient();
  const get = useServerFn(getMyProfile);
  const update = useServerFn(updateMyProfile);
  const { data } = useQuery({ queryKey: ["profile"], queryFn: () => get() });
  const [name, setName] = useState("");
  const [lang, setLang] = useState("English");
  const [voice, setVoice] = useState(true);

  useEffect(() => {
    if (!data) return;
    setName(data.display_name ?? "");
    setLang(data.preferred_language ?? "English");
    setVoice(data.voice_enabled ?? true);
  }, [data]);

  const mut = useMutation({
    mutationFn: (v: { display_name?: string; preferred_language?: string; voice_enabled?: boolean }) =>
      update({ data: v }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("Saved");
    },
  });

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label>Your name</Label>
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="space-y-1.5">
        <Label>Preferred language</Label>
        <Select value={lang} onValueChange={setLang}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {LANGUAGES.map((l) => (
              <SelectItem key={l} value={l}>{l}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center justify-between glass rounded-xl px-3 py-2">
        <div>
          <div className="text-sm font-medium">Voice replies</div>
          <div className="text-xs text-muted-foreground">Texa speaks back using ElevenLabs</div>
        </div>
        <Switch checked={voice} onCheckedChange={setVoice} />
      </div>
      <Button
        className="w-full btn-hero"
        onClick={() => mut.mutate({ display_name: name, preferred_language: lang, voice_enabled: voice })}
      >
        Save settings
      </Button>
    </div>
  );
}
