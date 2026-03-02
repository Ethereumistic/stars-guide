import { compositionalPlanets } from './planets';
import { compositionalSigns } from './signs';
import { compositionalHouses } from './houses';

/**
 * Dynamically constructs an interpretation paragraph for a specific placement.
 * @param planetId - string (e.g., 'sun', 'moon', or 'rising')
 * @param signId - string (e.g., 'aries', 'taurus')
 * @param houseId - optional number (1-12)
 * @returns string - A dynamically generated, grammatically correct synthesis.
 */
export function generateSynthesis(planetId: string, signId: string, houseId?: number): string {
    const sign = compositionalSigns.find(s => s.id === signId.toLowerCase());

    if (!sign) {
        throw new Error(`Invalid astrological sign ID provided to the engine: sign=${signId}`);
    }

    let synthesisString = '';

    if (planetId.toLowerCase() === 'rising') {
        const rulerPlanet = compositionalPlanets.find(p => p.id === sign.ruler.toLowerCase());
        synthesisString = `Your Ascendant crafts your external persona and initial approach to the world ${sign.compositionalAdverbialPhrase}`;

        if (rulerPlanet) {
            synthesisString += `, making ${rulerPlanet.name} your overall chart ruler`;
        }
    } else {
        const planet = compositionalPlanets.find(p => p.id === planetId.toLowerCase());

        if (!planet) {
            throw new Error(`Invalid astrological placement IDs provided to the engine: planet=${planetId}, sign=${signId}`);
        }

        const domainStr = planet.domain.toLowerCase();
        synthesisString = `Your ${domainStr} ${planet.compositionalVerbPhrase} ${sign.compositionalAdverbialPhrase}`;
    }

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

    // Ensure the first letter is capitalized
    synthesisString = synthesisString.charAt(0).toUpperCase() + synthesisString.slice(1);

    return synthesisString;
}

/**
 * Helper to fetch full structured data for a specific placement, 
 * useful for complex UI dashboards that need the breakdown.
 */
export function getPlacementData(planetId: string, signId: string, houseId?: number) {
    const sign = compositionalSigns.find(s => s.id === signId.toLowerCase());
    let planet = undefined;

    if (planetId.toLowerCase() !== 'rising') {
        planet = compositionalPlanets.find(p => p.id === planetId.toLowerCase());
        if (!planet) {
            throw new Error(`Invalid planet ID provided: ${planetId}`);
        }
    }

    let house = undefined;

    if (houseId !== undefined) {
        house = compositionalHouses.find(h => h.id === houseId);
    }

    if (!sign) {
        throw new Error(`Invalid astrological sign ID provided: sign=${signId}`);
    }

    return {
        planet,
        sign,
        house,
        synthesis: generateSynthesis(planetId, signId, houseId)
    };
}
