import { type ChartPlanet, type ChartAspect } from '@/lib/birth-chart/full-chart';

// Aspect configuration with standard orbs
export const aspectConfig = [
    { type: "conjunction", angle: 0, orb: 8 },
    { type: "sextile", angle: 60, orb: 6 },
    { type: "square", angle: 90, orb: 8 },
    { type: "trine", angle: 120, orb: 8 },
    { type: "opposition", angle: 180, orb: 8 },
] as const;

/**
 * Calculates astrological aspects between a set of given planetary positions.
 * 
 * @param planets - The array of planet positions (from chart calculation)
 * @returns The list of major astrological aspects with their respective orbs
 */
export function calculateAspects(planets: ChartPlanet[]): ChartAspect[] {
    const aspects: ChartAspect[] = [];

    for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            const p1 = planets[i];
            const p2 = planets[j];

            let diff = Math.abs(p1.longitude - p2.longitude);
            if (diff > 180) {
                diff = 360 - diff;
            }

            for (const ac of aspectConfig) {
                const orb = Math.abs(diff - ac.angle);
                if (orb <= ac.orb) {
                    aspects.push({
                        planet1: p1.id,
                        planet2: p2.id,
                        type: ac.type,
                        angle: diff,
                        orb: orb
                    });
                    break; // Max 1 aspect between two planets
                }
            }
        }
    }

    return aspects;
}
