"use client";

import * as React from "react";
import { motion } from "motion/react";
import { create } from "zustand";
import { AlertTriangle, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  DEFAULT_TOKEN_LIMITS,
  TOKEN_LIMIT_DEFINITIONS,
  TOKEN_LIMIT_KEYS,
  type TokenLimitKey,
  type TokenLimitRecord,
} from "../../../lib/oracle/soul";

const MAX_TOKENS = 2500;
const MIN_GAP = 50;

function clampTokenValue(
  key: TokenLimitKey,
  value: number,
  currentValues: TokenLimitRecord,
) {
  const index = TOKEN_LIMIT_KEYS.indexOf(key);
  const previousKey = TOKEN_LIMIT_KEYS[index - 1];
  const nextKey = TOKEN_LIMIT_KEYS[index + 1];

  const min = previousKey ? currentValues[previousKey] + MIN_GAP : 0;
  const max = nextKey ? currentValues[nextKey] - MIN_GAP : MAX_TOKENS;

  return Math.max(min, Math.min(max, Math.round(value)));
}

const useTokenLimitEditorStore = create<{
  values: TokenLimitRecord;
  setAll: (values: TokenLimitRecord) => void;
  update: (key: TokenLimitKey, value: number) => void;
}>((set, get) => ({
  values: DEFAULT_TOKEN_LIMITS,
  setAll: (values) => set({ values }),
  update: (key, value) => {
    const nextValues = {
      ...get().values,
      [key]: clampTokenValue(key, value, get().values),
    } as TokenLimitRecord;
    set({ values: nextValues });
  },
}));

export function TokenLimitsEditor({
  initialValues,
  isSaving,
  onSave,
}: {
  initialValues: TokenLimitRecord;
  isSaving: boolean;
  onSave: (values: TokenLimitRecord) => Promise<void>;
}) {
  const trackRef = React.useRef<HTMLDivElement | null>(null);
  const [draggingKey, setDraggingKey] = React.useState<TokenLimitKey | null>(null);
  const values = useTokenLimitEditorStore((state) => state.values);
  const setAll = useTokenLimitEditorStore((state) => state.setAll);
  const update = useTokenLimitEditorStore((state) => state.update);

  React.useEffect(() => {
    setAll(initialValues);
  }, [initialValues, setAll]);

  React.useEffect(() => {
    if (!draggingKey) {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      const track = trackRef.current;
      if (!track) {
        return;
      }

      const rect = track.getBoundingClientRect();
      const ratio = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
      update(draggingKey, ratio * MAX_TOKENS);
    };

    const handlePointerUp = () => setDraggingKey(null);

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [draggingKey, update]);

  const hasChanges = JSON.stringify(values) !== JSON.stringify(initialValues);
  const hardLimitWarning = values.tokens_hard_limit < values.tokens_long;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-white/10 bg-black/20 p-5">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold">Token Limits</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Oracle chooses the response tier. OpenRouter receives the hard limit ceiling.
            </p>
          </div>
          <Button onClick={() => onSave(values)} disabled={!hasChanges || isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Token Limits"}
          </Button>
        </div>

        <div className="rounded-[28px] border border-white/10 bg-zinc-950/80 px-4 py-6">
          <div ref={trackRef} className="relative h-28 select-none">
            <div className="absolute inset-x-0 top-12 h-3 rounded-full bg-white/10" />
            <div className="absolute inset-x-0 top-12 h-3 rounded-full bg-gradient-to-r from-cyan-500/30 via-yellow-500/25 to-fuchsia-500/30" />
            {TOKEN_LIMIT_KEYS.map((key) => {
              const meta = TOKEN_LIMIT_DEFINITIONS[key];
              const left = `${(values[key] / MAX_TOKENS) * 100}%`;
              return (
                <motion.button
                  key={key}
                  type="button"
                  layout
                  onPointerDown={() => setDraggingKey(key)}
                  className="absolute top-0 flex -translate-x-1/2 flex-col items-center gap-2"
                  style={{ left }}
                  whileTap={{ scale: 1.04 }}
                >
                  <span className="max-w-24 text-center text-[11px] font-medium uppercase tracking-[0.18em] text-white/75">
                    {meta.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{values[key]} tokens</span>
                  <span
                    className="mt-1 h-6 w-6 rounded-full border-2 border-white/80 shadow-[0_0_0_6px_rgba(255,255,255,0.08)]"
                    style={{ backgroundColor: meta.color }}
                  />
                </motion.button>
              );
            })}
          </div>
        </div>

        {hardLimitWarning ? (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            <AlertTriangle className="h-4 w-4" />
            Hard limit is lower than Long cap. The model can be cut off mid-response.
          </div>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {TOKEN_LIMIT_KEYS.map((key) => {
          const meta = TOKEN_LIMIT_DEFINITIONS[key];
          return (
            <div key={key} className="rounded-2xl border border-white/10 bg-card/40 p-4">
              <div className="mb-3 flex items-start gap-3">
                <span
                  className="mt-1 h-3 w-3 rounded-full"
                  style={{ backgroundColor: meta.color }}
                />
                <div>
                  <Label htmlFor={key} className="text-sm font-medium">
                    {meta.label}
                  </Label>
                  <p className="mt-1 text-xs text-muted-foreground">{meta.description}</p>
                </div>
              </div>
              <Input
                id={key}
                type="number"
                min={0}
                max={MAX_TOKENS}
                value={values[key]}
                onChange={(event) => update(key, Number.parseInt(event.target.value || "0", 10))}
                className={cn("border-white/10 bg-black/20", draggingKey === key && "ring-2 ring-white/20")}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                approx. {Math.round(values[key] / 1.33)} words
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
