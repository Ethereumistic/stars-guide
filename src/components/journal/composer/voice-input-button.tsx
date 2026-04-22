"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
    isVoiceInputSupported,
    createVoiceRecognition,
    type VoiceRecognitionController,
} from "@/lib/journal/voiceInput";
import { useJournalStore } from "@/store/use-journal-store";
import { Mic, MicOff } from "lucide-react";

interface VoiceInputButtonProps {
    /** Append final transcript to this content */
    onTranscript: (text: string) => void;
    /** Called when interim transcript changes (for live preview) */
    onInterim?: (text: string) => void;
    className?: string;
}

export function VoiceInputButton({
    onTranscript,
    onInterim,
    className,
}: VoiceInputButtonProps) {
    const {
        isRecording,
        setRecording,
        interimTranscript,
        setInterimTranscript,
        setFinalTranscript,
    } = useJournalStore();

    const controllerRef = React.useRef<VoiceRecognitionController | null>(null);
    const [notSupported, setNotSupported] = React.useState(false);
    const finalTextRef = React.useRef("");

    // Create controller on mount
    React.useEffect(() => {
        if (typeof window === "undefined") return;

        if (!isVoiceInputSupported()) {
            setNotSupported(true);
            return;
        }

        controllerRef.current = createVoiceRecognition(
            // onInterim
            (text) => {
                setInterimTranscript(text);
                onInterim?.(text);
            },
            // onFinal
            (text) => {
                // Append final text
                finalTextRef.current += (finalTextRef.current ? " " : "") + text;
                setFinalTranscript(finalTextRef.current);
                setInterimTranscript(""); // Clear interim once finalized
                onTranscript(text);
            },
            // onError
            (error) => {
                console.error("Voice recognition error:", error);
                stopRecording();
            },
        );

        return () => {
            // Cleanup on unmount
            if (controllerRef.current?.isActive()) {
                controllerRef.current.stop();
            }
            controllerRef.current = null;
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    function startRecording() {
        if (!controllerRef.current) return;
        finalTextRef.current = "";
        setInterimTranscript("");
        setFinalTranscript("");
        setRecording(true);
        controllerRef.current.start();
    }

    function stopRecording() {
        if (!controllerRef.current) return;
        controllerRef.current.stop();
        setRecording(false);
        setInterimTranscript("");
    }

    function toggleRecording() {
        if (notSupported) return;
        if (isRecording) {
            stopRecording();
        } else {
            startRecording();
        }
    }

    return (
        <div className="flex items-center gap-2">
            <button
                type="button"
                onClick={toggleRecording}
                disabled={notSupported}
                className={cn(
                    "relative flex items-center justify-center rounded-full border transition-all",
                    isRecording
                        ? "border-red-500/40 bg-red-500/10 text-red-400"
                        : "border-white/10 bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60",
                    notSupported && "opacity-40 cursor-not-allowed",
                    className
                )}
                title={
                    notSupported
                        ? "Voice input not supported in this browser"
                        : isRecording
                          ? "Stop recording"
                          : "Start voice input"
                }
            >
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                {/* Pulsing rings when recording */}
                {isRecording && (
                    <>
                        <span className="absolute inset-0 rounded-full border border-red-500/40 animate-ping" />
                        <span className="absolute inset-0 rounded-full border border-red-500/20 animate-pulse" />
                    </>
                )}
            </button>

            {/* Live interim transcript preview */}
            {isRecording && interimTranscript && (
                <span className="text-xs text-white/30 italic max-w-[200px] truncate">
                    {interimTranscript}
                </span>
            )}

            {/* Recording indicator text */}
            {isRecording && !interimTranscript && (
                <span className="text-xs text-red-400/60 animate-pulse">
                    Listening...
                </span>
            )}
        </div>
    );
}