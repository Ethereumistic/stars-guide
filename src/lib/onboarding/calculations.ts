import { compositionalSigns, type SignData } from '@/astrology/signs';

/**
 * Estimate Rising Sign based on Sun Sign and time of day
 */
export const estimateRisingSign = (
    sunSignId: string,
    timeOfDay: "morning" | "afternoon" | "evening" | "night" | "unknown" | null,
    answers: Record<string, string>
): SignData => {
    const sunIndex = compositionalSigns.findIndex(s => s.id === sunSignId);
    if (sunIndex === -1) return compositionalSigns[0];

    // 1. Scoring each sign based on detective answers
    const scores: Record<string, number> = {};
    compositionalSigns.forEach(s => scores[s.id] = 0);

    Object.values(answers).forEach(val => {
        if (scores[val] !== undefined) {
            scores[val] += 5; // Direct match weight
        }
    });

    // 2. Define probable offsets from sun sign based on time of day
    // Each 2 hours roughly = 1 sign (30 degrees).
    // Sunrise (6am) = Sun sign is ASC.
    let possibleOffsets: number[] = [];
    switch (timeOfDay) {
        case "morning": // 6am - 12pm
            possibleOffsets = [0, 1, 2];
            break;
        case "afternoon": // 12pm - 6pm
            possibleOffsets = [3, 4, 5];
            break;
        case "evening": // 6pm - 12am
            possibleOffsets = [6, 7, 8];
            break;
        case "night": // 12am - 6am
            possibleOffsets = [9, 10, 11];
            break;
        default:
            possibleOffsets = Array.from({ length: 12 }, (_, i) => i);
    }

    // 3. Find the best match within the time constraint
    // We give a small bonus for being in the "likely" window, 
    // then pick the one with the highest trait score.
    const candidates = possibleOffsets.map(offset => {
        const index = (sunIndex + offset) % 12;
        const sign = compositionalSigns[index];
        return {
            sign,
            score: (scores[sign.id] || 0) + 1 // Add 1 as a baseline for being in the right time window
        };
    });

    // Sort by score descending
    candidates.sort((a, b) => b.score - a.score);

    return candidates[0].sign;
};
