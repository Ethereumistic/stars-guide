/**
 * voiceInput.ts — Web Speech API wrapper for voice journaling.
 *
 * Browser-native SpeechRecognition (Chrome) / webkitSpeechRecognition (Safari).
 * Zero external services, zero cost.
 */

/**
 * Check if the browser supports the Web Speech API.
 */
export function isVoiceInputSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!(
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    );
}

export interface VoiceRecognitionController {
    /** Start listening */
    start: () => void;
    /** Stop listening and finalize */
    stop: () => void;
    /** Whether recognition is currently active */
    isActive: () => boolean;
}

/**
 * Create a SpeechRecognition instance with continuous + interim results.
 *
 * @param onInterim - Called with interim (partial) transcript text
 * @param onFinal  - Called with finalized transcript text (appended per utterance)
 * @param onError  - Called with an error message string
 * @param lang     - BCP-47 language tag (default: navigator.language or "en-US")
 * @returns Controller object, or null if not supported
 */
export function createVoiceRecognition(
    onInterim: (text: string) => void,
    onFinal: (text: string) => void,
    onError: (error: string) => void,
    lang?: string,
): VoiceRecognitionController | null {
    if (!isVoiceInputSupported()) return null;

    const SpeechRecognitionCtor =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    const recognition = new SpeechRecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = lang ?? navigator.language ?? "en-US";

    try { (recognition as any).processLocally = true; } catch {}

    let active = false;

    recognition.onresult = (event: any) => {
        let interimTranscript = "";
        let finalTranscript = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i];
            if (result.isFinal) {
                finalTranscript += result[0].transcript;
            } else {
                interimTranscript += result[0].transcript;
            }
        }

        if (interimTranscript) {
            onInterim(interimTranscript);
        }
        if (finalTranscript) {
            onFinal(finalTranscript);
        }
    };

    recognition.onerror = (event: any) => {
        // "no-speech" is common and not a real error — don't fire onError for it
        if (event.error === "no-speech" || event.error === "aborted") return;
        onError(event.error ?? "Unknown speech recognition error");
    };

    recognition.onend = () => {
        active = false;
    };

    return {
        start: () => {
            if (active) return;
            try {
                recognition.start();
                active = true;
            } catch (e: any) {
                onError(e?.message ?? "Failed to start speech recognition");
            }
        },
        stop: () => {
            try {
                recognition.stop();
                active = false;
            } catch {
                // Already stopped
            }
        },
        isActive: () => active,
    };
}