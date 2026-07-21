/** Browser-native speech recognition shared by Oracle and Journal. */

export function isVoiceInputSupported(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition,
  );
}

export interface VoiceRecognitionController {
  start: () => boolean;
  stop: () => void;
  isActive: () => boolean;
}

export function createVoiceRecognition(
  onInterim: (text: string) => void,
  onFinal: (text: string) => void,
  onError: (error: string) => void,
  lang?: string,
  onEnd?: () => void,
): VoiceRecognitionController | null {
  if (!isVoiceInputSupported()) return null;

  const SpeechRecognitionCtor =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognition = new SpeechRecognitionCtor();
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.lang = lang ?? navigator.language ?? "en-US";

  // Chromium may honor this when an on-device language pack is available.
  // It is a preference, not a privacy guarantee.
  try { (recognition as any).processLocally = true; } catch {}

  let active = false;
  recognition.onresult = (event: any) => {
    let interimTranscript = "";
    let finalTranscript = "";
    for (let index = event.resultIndex; index < event.results.length; index++) {
      const result = event.results[index];
      if (result.isFinal) finalTranscript += result[0].transcript;
      else interimTranscript += result[0].transcript;
    }
    onInterim(interimTranscript);
    if (finalTranscript) onFinal(finalTranscript);
  };
  recognition.onerror = (event: any) => {
    if (event.error !== "no-speech" && event.error !== "aborted") {
      onError(event.error ?? "Speech recognition failed");
    }
  };
  recognition.onend = () => {
    active = false;
    onEnd?.();
  };

  return {
    start: () => {
      if (active) return true;
      try {
        recognition.start();
        active = true;
        return true;
      } catch (error) {
        onError(error instanceof Error ? error.message : "Speech recognition could not start");
        return false;
      }
    },
    stop: () => {
      if (!active) return;
      try { recognition.stop(); } catch {}
      active = false;
    },
    isActive: () => active,
  };
}
