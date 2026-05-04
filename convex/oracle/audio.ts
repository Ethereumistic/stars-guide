"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { api } from "../_generated/api";

/**
 * Generate a binaural beat audio file programmatically and store it
 * in Convex file storage.
 *
 * Binaural beats are created by playing two slightly different frequencies
 * in stereo — one in each ear. The brain perceives a "beat" at the
 * difference frequency, which can entrain brainwaves to that frequency.
 *
 * Example: 200 Hz (left) + 210 Hz (right) = 10 Hz alpha-wave beat
 *
 * This is generated pure-mathematically (sine wave synthesis) and encoded
 * as a WAV file, stored via Convex file storage (no inline base64 — the
 * file is too large for document size limits).
 *
 * Brainwave frequency bands:
 *   Delta  (0.5–4 Hz)  — Deep sleep, healing
 *   Theta  (4–8 Hz)    — Meditation, creativity, intuition
 *   Alpha  (8–14 Hz)   — Relaxation, focus, flow
 *   Beta   (14–30 Hz)  — Active thinking, concentration
 *   Gamma  (30–100 Hz)  — High-level cognition, insight
 */

// ── Brainwave band definitions ──────────────────────────────────────────────
interface BrainwaveBand {
  name: string;
  range: [number, number]; // Hz
  description: string;
}

const BRAINWAVE_BANDS: BrainwaveBand[] = [
  { name: "delta", range: [0.5, 4], description: "deep sleep & healing" },
  { name: "theta", range: [4, 8], description: "meditation & creativity" },
  { name: "alpha", range: [8, 14], description: "relaxation & focus" },
  { name: "beta", range: [14, 30], description: "active thinking" },
  { name: "gamma", range: [30, 50], description: "insight & cognition" },
];

// ── Prompt parsing ─────────────────────────────────────────────────────────

interface BinauralParams {
  baseFreq: number;     // Carrier frequency (Hz) — what you hear
  beatFreq: number;      // Binaural beat frequency (Hz) — what the brain perceives
  durationSec: number;   // Length in seconds
  bandName: string;      // Human-readable band name
  description: string;   // Human-readable description
}

/**
 * Parse the user's prompt to determine binaural beat parameters.
 * Accepts natural language like "calming theta-wave binaural beat"
 * or "alpha wave for focus" and extracts the desired brainwave band
 * and duration. Falls back to theta (meditation) if ambiguous.
 */
function parsePrompt(prompt: string): BinauralParams {
  const lower = prompt.toLowerCase();

  // Default: theta wave (meditation/creativity)
  let targetBand = BRAINWAVE_BANDS.find((b) => b.name === "theta")!;
  let beatFreq: number | null = null;

  // Check for explicit frequency: "at 10 Hz", "10hz", "10 hz"
  const hzMatch = lower.match(/(\d+(?:\.\d+)?)\s*hz/);
  if (hzMatch) {
    beatFreq = parseFloat(hzMatch[1]);
  }

  // Check for band keyword (longer keywords first to avoid substrings)
  const bandKeywords: Record<string, string> = {
    // Gamma
    gamma: "gamma",
    // Beta
    beta: "beta",
    // Alpha
    alpha: "alpha",
    // Theta
    theta: "theta",
    // Delta
    delta: "delta",
    deepsleep: "delta",
    "deep sleep": "delta",
    sleep: "delta",
    // Relaxation keywords
    relax: "alpha",
    calm: "alpha",
    focus: "alpha",
    concentrat: "beta",
    alert: "beta",
    energy: "beta",
    meditat: "theta",
    creativ: "theta",
    intuit: "theta",
    dream: "theta",
    insight: "gamma",
    cognit: "gamma",
    heal: "delta",
    restor: "delta",
  };

  for (const [keyword, bandName] of Object.entries(bandKeywords)) {
    if (lower.includes(keyword)) {
      targetBand = BRAINWAVE_BANDS.find((b) => b.name === bandName)!;
      break;
    }
  }

  // Use explicit Hz if provided, otherwise pick middle of band
  if (beatFreq === null) {
    beatFreq = (targetBand.range[0] + targetBand.range[1]) / 2;
  } else {
    // Find which band the explicit Hz falls into
    const matchedBand = BRAINWAVE_BANDS.find(
      (b) => beatFreq! >= b.range[0] && beatFreq! <= b.range[1]
    );
    if (matchedBand) {
      targetBand = matchedBand;
    }
  }

  // Parse duration: "5 min", "5min", "300s", "5 minutes", default 5 min
  let durationSec = 300; // 5 minutes default
  const minMatch = lower.match(/(\d+)\s*min(?:ute)?/);
  const secMatch = lower.match(/(\d+)\s*sec(?:ond)?/);
  if (minMatch) {
    durationSec = parseInt(minMatch[1]) * 60;
  } else if (secMatch) {
    durationSec = parseInt(secMatch[1]);
  }
  // Clamp: 30s minimum, 30 min maximum
  durationSec = Math.max(30, Math.min(1800, durationSec));

  // Pick a carrier frequency that sounds pleasant (150–250 Hz range)
  // Lower carriers feel deeper, higher carriers feel more alert
  const carrierMap: Record<string, number> = {
    delta: 150,
    theta: 174,
    alpha: 200,
    beta: 226,
    gamma: 243,
  };
  const baseFreq = carrierMap[targetBand.name] ?? 200;

  return {
    baseFreq,
    beatFreq,
    durationSec,
    bandName: targetBand.name,
    description: targetBand.description,
  };
}

// ── WAV encoding ───────────────────────────────────────────────────────────

/**
 * Encode raw PCM float samples as a 16-bit stereo WAV file.
 */
function encodeWav(
  samplesL: Float32Array,
  samplesR: Float32Array,
  sampleRate: number
): Buffer {
  const numSamples = samplesL.length;
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = numSamples * blockAlign;

  // 44-byte header + PCM data
  const buffer = Buffer.alloc(44 + dataSize);

  // RIFF header
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);

  // fmt sub-chunk
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);             // Sub-chunk size
  buffer.writeUInt16LE(1, 20);              // PCM format
  buffer.writeUInt16LE(numChannels, 22);    // Channels
  buffer.writeUInt32LE(sampleRate, 24);      // Sample rate
  buffer.writeUInt32LE(sampleRate * blockAlign, 28); // Byte rate
  buffer.writeUInt16LE(blockAlign, 32);      // Block align
  buffer.writeUInt16LE(bitsPerSample, 34);   // Bits per sample

  // data sub-chunk
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);

  // PCM samples — interleave L/R, convert float [-1..1] → int16
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    // Left channel
    const sl = Math.max(-1, Math.min(1, samplesL[i]));
    buffer.writeInt16LE(Math.round(sl * 32767), offset);
    offset += 2;
    // Right channel
    const sr = Math.max(-1, Math.min(1, samplesR[i]));
    buffer.writeInt16LE(Math.round(sr * 32767), offset);
    offset += 2;
  }

  return buffer;
}

// ── Audio synthesis ────────────────────────────────────────────────────────

/**
 * Generate binaural beat samples for left and right channels.
 *
 * The binaural beat effect is created by:
 *   Left ear  = sin(2π × baseFreq × t)
 *   Right ear = sin(2π × (baseFreq + beatFreq) × t)
 *
 * The brain perceives the difference frequency (beatFreq) as a rhythmic
 * pulsation. We also add a gentle amplitude envelope (fade in/fade out)
 * and a soft ambient pad for warmth.
 */
function synthesizeBinauralBeat(params: BinauralParams): {
  wavBuffer: Buffer;
  sampleRate: number;
} {
  const { baseFreq, beatFreq, durationSec } = params;
  // 16000 Hz is plenty for binaural beats — our highest frequency is
  // the harmonic at ~2×carrier (≤500 Hz), well within the 8 kHz Nyquist.
  const sampleRate = 16000;
  const numSamples = Math.floor(sampleRate * durationSec);

  const left = new Float32Array(numSamples);
  const right = new Float32Array(numSamples);

  // Fade envelope: 3s fade in, 3s fade out
  const fadeSamples = Math.min(3 * sampleRate, Math.floor(numSamples / 4));

  // Frequencies
  const freqL = baseFreq;
  const freqR = baseFreq + beatFreq;

  // A soft sub-bass drone at 1/2 the carrier for warmth
  const droneFreq = baseFreq / 2;

  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;

    // Amplitude envelope
    let envelope = 1.0;
    if (i < fadeSamples) {
      envelope = i / fadeSamples; // Fade in
    } else if (i > numSamples - fadeSamples) {
      envelope = (numSamples - i) / fadeSamples; // Fade out
    }

    // Main binaural tones
    const toneL = Math.sin(2 * Math.PI * freqL * t);
    const toneR = Math.sin(2 * Math.PI * freqR * t);

    // Subtle drone for warmth (same in both ears — not binaural)
    const drone = 0.15 * Math.sin(2 * Math.PI * droneFreq * t);

    // Gentle harmonic overtone (octave above carrier, very quiet)
    const harmonic = 0.08 * Math.sin(2 * Math.PI * (freqL * 2) * t);

    // Mix: binaural tones prominent, drone & harmonic subtle
    left[i] = envelope * (0.6 * toneL + drone + harmonic);
    right[i] = envelope * (0.6 * toneR + drone + harmonic);
  }

  // Encode as WAV
  const wavBuffer = encodeWav(left, right, sampleRate);

  return { wavBuffer, sampleRate };
}

// ── Convex action ──────────────────────────────────────────────────────────

export const generateBinauralBeat = action({
  args: {
    sessionId: v.id("oracle_sessions"),
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    // ── Load session ──────────────────────────────────────────────────
    const session = await ctx.runQuery(api.oracle.sessions.getSessionWithMessages, {
      sessionId: args.sessionId,
    });
    if (!session) {
      throw new Error("Session not found");
    }

    // ── Parse prompt → binaural parameters ────────────────────────────
    const params = parsePrompt(args.prompt);

    console.log(
      `Binaural beat: baseFreq=${params.baseFreq}Hz beatFreq=${params.beatFreq}Hz ` +
      `duration=${params.durationSec}s band=${params.bandName} (${params.description})`
    );

    // ── Synthesize audio ──────────────────────────────────────────────
    const { wavBuffer, sampleRate } = synthesizeBinauralBeat(params);

    console.log(
      `Binaural beat: WAV size=${(wavBuffer.length / 1024 / 1024).toFixed(2)} MB ` +
      `sampleRate=${sampleRate}Hz`
    );

    // ── Store WAV in Convex file storage ──────────────────────────────
    // Storing as a file avoids Convex's document size limits (~1 MB).
    // The storage ID is saved in the message; the client resolves it to a URL.
    const wavBlob = new Blob([new Uint8Array(wavBuffer)], { type: "audio/wav" });
    const audioStorageId = await ctx.storage.store(wavBlob);

    // ── Build a descriptive content message ───────────────────────────
    const content =
      `✦ Here is your ${params.bandName}-wave binaural beat tuned for ${params.description}.\n\n` +
      `**Carrier frequency:** ${params.baseFreq} Hz\n` +
      `**Beat frequency:** ${params.beatFreq} Hz (${params.bandName} range)\n` +
      `**Duration:** ${Math.floor(params.durationSec / 60)}:${String(params.durationSec % 60).padStart(2, "0")}\n\n` +
      `Listen with headphones for the full binaural effect. The beat frequency ` +
      `of ${params.beatFreq} Hz will gently entrain your brainwaves toward the ` +
      `${params.bandName} state (${params.description}).`;

    // ── Persist assistant message with audio storage ID ───────────────
    await ctx.runMutation(api.oracle.sessions.addMessage, {
      sessionId: args.sessionId,
      role: "assistant",
      content,
      modelUsed: "oracle/binaural-synth",
      audioStorageId,
    });

    // ── Increment quota on first response ─────────────────────────────
    const isFirstResponse = !session.messages.some(
      (m: any) => m.role === "assistant"
    );
    if (isFirstResponse) {
      try {
        await ctx.runMutation(api.oracle.quota.incrementQuota, {});
      } catch (e) {
        console.error("Binaural beat quota increment failed (non-blocking):", e);
      }
    }

    return { content, audioStorageId };
  },
});