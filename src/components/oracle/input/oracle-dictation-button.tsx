"use client";

import * as React from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  createVoiceRecognition,
  isVoiceInputSupported,
  type VoiceRecognitionController,
} from "@/lib/speech/voice-input";

interface OracleDictationButtonProps {
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  maxLength?: number;
}

export interface OracleDictationHandle {
  stop: () => void;
}

export const OracleDictationButton = React.forwardRef<OracleDictationHandle, OracleDictationButtonProps>(function OracleDictationButton({
  value,
  onValueChange,
  disabled = false,
  maxLength = 2000,
}, ref) {
  const controllerRef = React.useRef<VoiceRecognitionController | null>(null);
  const valueRef = React.useRef(value);
  const changeRef = React.useRef(onValueChange);
  const [supported, setSupported] = React.useState(true);
  const [listening, setListening] = React.useState(false);
  const [interim, setInterim] = React.useState("");
  const [status, setStatus] = React.useState("");

  React.useEffect(() => { valueRef.current = value; }, [value]);
  React.useEffect(() => { changeRef.current = onValueChange; }, [onValueChange]);

  React.useEffect(() => {
    if (!isVoiceInputSupported()) {
      setSupported(false);
      return;
    }
    controllerRef.current = createVoiceRecognition(
      setInterim,
      (transcript) => {
        const current = valueRef.current;
        const spacer = current && !/\s$/.test(current) ? " " : "";
        const next = `${current}${spacer}${transcript.trim()}`.slice(0, maxLength);
        valueRef.current = next;
        changeRef.current(next);
        setInterim("");
      },
      (error) => {
        const message = error === "not-allowed" || error === "service-not-allowed"
          ? "Microphone permission was denied."
          : "Dictation stopped. Try again or continue typing.";
        setStatus(message);
        setListening(false);
      },
      undefined,
      () => setListening(false),
    );
    return () => {
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
  }, [maxLength]);

  const stop = React.useCallback(() => {
    controllerRef.current?.stop();
    setListening(false);
    setInterim("");
  }, []);

  React.useImperativeHandle(ref, () => ({ stop }), [stop]);

  React.useEffect(() => {
    if (disabled && listening) {
      stop();
    }
  }, [disabled, listening, stop]);

  const toggle = () => {
    if (!supported || disabled || !controllerRef.current) return;
    if (listening) {
      stop();
      setStatus("Dictation stopped.");
    } else {
      setStatus("Listening. Your browser may use its speech service.");
      setInterim("");
      setListening(controllerRef.current.start());
    }
  };

  const tooltip = !supported
    ? "Dictation is not supported in this browser"
    : listening
      ? "Stop dictation"
      : "Dictate with your browser's speech service";

  return (
    <div className="flex min-w-0 items-center gap-2">
      {listening && (
        <span className="hidden max-w-28 truncate text-[11px] text-galactic/80 sm:block">
          {interim || "Listening…"}
        </span>
      )}
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={toggle}
                disabled={disabled || !supported}
                className={`relative size-10 rounded-full text-white/55 hover:bg-white/[0.08] hover:text-white ${listening ? "bg-galactic/15 text-galactic" : ""}`}
                aria-label={tooltip}
                aria-pressed={listening}
              >
                {listening ? <MicOff className="size-[18px]" /> : <Mic className="size-[18px]" />}
                {listening && <span className="absolute inset-1 rounded-full border border-galactic/40 motion-safe:animate-ping" />}
              </Button>
            </span>
          </TooltipTrigger>
          <TooltipContent side="top" sideOffset={8}>{tooltip}</TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <span className="sr-only" aria-live="polite">{status}</span>
    </div>
  );
});
