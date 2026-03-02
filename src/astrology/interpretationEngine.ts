import { compositionalPlanets } from './planets';
import { compositionalSigns } from './signs';
import { compositionalHouses } from './houses';

/**
 * Dynamically constructs an interpretation paragraph for a specific placement.
 * @param planetId - string (e.g., 'sun', 'moon')
 * @param signId - string (e.g., 'aries', 'taurus')
 * @param houseId - optional number (1-12)
 * @returns string - A dynamically generated, grammatically correct synthesis.
 */
export function generateSynthesis(planetId: string, signId: string, houseId?: number): string {
    const planet = compositionalPlanets.find(p => p.id === planetId.toLowerCase());
    const sign = compositionalSigns.find(s => s.id === signId.toLowerCase());

    if (!planet || !sign) {
        throw new Error(`Invalid astrological placement IDs provided to the engine: planet=${planetId}, sign=${signId}`);
    }

    let synthesisString = `Your ${planet.domain.toLowerCase()} (${planet.name}) ${planet.compositionalVerbPhrase} ${sign.compositionalAdverbialPhrase}`;

    if (houseId !== undefined) {
        const house = compositionalHouses.find(h => h.id === houseId);
        if (house) {
            synthesisString += `, particularly manifesting ${house.compositionalPrepositionalPhrase}.`;
        } else {
            synthesisString += ".";
        }
    } else {
        synthesisString += ".";
    }

    return synthesisString;
}

/**
 * Helper to fetch full structured data for a specific placement, 
 * useful for complex UI dashboards that need the breakdown.
 */
export function getPlacementData(planetId: string, signId: string, houseId?: number) {
    const planet = compositionalPlanets.find(p => p.id === planetId.toLowerCase());
    const sign = compositionalSigns.find(s => s.id === signId.toLowerCase());
    let house = undefined;

    if (houseId !== undefined) {
        house = compositionalHouses.find(h => h.id === houseId);
    }

    if (!planet || !sign) {
        throw new Error(`Invalid astrological placement IDs provided to the engine: planet=${planetId}, sign=${signId}`);
    }

    return {
        planet,
        sign,
        house,
        synthesis: generateSynthesis(planetId, signId, houseId)
    };
}
