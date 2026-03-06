import * as Astronomy from 'astronomy-engine';
import { compositionalSigns } from '@/astrology/signs';
import { localBirthTimeToUTC, eclipticLongitudeToSign } from './core';
import { calculateAscendant } from './calculations';
import { calculateAspects } from '@/lib/aspects/calculations';

export interface ChartPlanet {
    id: string; // "sun", "moon", "mercury", etc.
    longitude: number; // 0-360
    signId: string;
    houseId: number; // 1-12
    retrograde: boolean;
}

export interface ChartHouse {
    id: number; // 1-12
    signId: string;
    longitude: number; // the starting degree of the house (0-360)
}

export interface ChartAspect {
    planet1: string;
    planet2: string;
    type: "conjunction" | "sextile" | "square" | "trine" | "opposition";
    angle: number; // exact difference
    orb: number; // distance from exact aspect
}

export interface ChartData {
    planets: ChartPlanet[];
    houses: ChartHouse[];
    aspects: ChartAspect[];
    ascendant: { signId: string; longitude: number } | null;
}

/**
 * Calculates a complete natal chart using the Whole Sign house system.
 */
export function calculateFullChart(
    year: number,
    month: number,
    day: number,
    hours: number,
    minutes: number,
    latitude: number,
    longitude: number
): ChartData {
    // 1. Convert to UTC
    const dateUTC = localBirthTimeToUTC(year, month, day, hours, minutes, latitude, longitude);

    // We also need a slightly future date to check for retrograde motion
    const futureDate = new Date(dateUTC.getTime() + 1000 * 60);

    // 2. Ascendant
    const ascSign = calculateAscendant(dateUTC, latitude, longitude);

    // Ascendant longitude is needed. Let's trace it.
    const gast = Astronomy.SiderealTime(dateUTC);
    const lstHours = gast + (longitude / 15);
    const lstDeg = ((lstHours * 15) % 360 + 360) % 360;
    const lstRad = lstDeg * (Math.PI / 180);
    const time = Astronomy.MakeTime(dateUTC);
    const oblRad = Astronomy.e_tilt(time).tobl * (Math.PI / 180);
    const latRad = latitude * (Math.PI / 180);
    const y = Math.cos(lstRad);
    const x = -(Math.sin(oblRad) * Math.tan(latRad)) - (Math.cos(oblRad) * Math.sin(lstRad));
    let ascDeg = (Math.atan2(y, x) * (180 / Math.PI)) % 360;
    ascDeg = (ascDeg + 360) % 360;

    const ascendant = { signId: ascSign.id, longitude: ascDeg };

    // 3. Houses (Whole Sign System)
    // 1st house is the entire sign of the Ascendant.
    const ascSignIndex = compositionalSigns.findIndex(s => s.id === ascSign.id);
    const houses: ChartHouse[] = [];
    for (let i = 0; i < 12; i++) {
        const houseSignIndex = (ascSignIndex + i) % 12;
        houses.push({
            id: i + 1,
            signId: compositionalSigns[houseSignIndex].id,
            longitude: houseSignIndex * 30 // 0 degrees of that sign
        });
    }

    // Helper to get house
    const getHouseId = (lon: number): number => {
        const signIndex = Math.floor(lon / 30);
        // Find which house has this sign
        const h = houses.find(h => h.signId === compositionalSigns[signIndex].id);
        return h ? h.id : 1;
    };

    // 4. Planets
    const planets: ChartPlanet[] = [];

    const getEclipticLon = (body: Astronomy.Body, d: Date) => {
        if (body === Astronomy.Body.Sun) {
            return Astronomy.SunPosition(d).elon;
        } else if (body === Astronomy.Body.Moon) {
            return Astronomy.EclipticGeoMoon(d).lon;
        } else {
            return Astronomy.Ecliptic(Astronomy.GeoVector(body, d, true)).elon;
        }
    };

    const addPlanet = (id: string, body: Astronomy.Body) => {
        const lon = (getEclipticLon(body, dateUTC) + 360) % 360;
        const futureLon = (getEclipticLon(body, futureDate) + 360) % 360;

        let diff = futureLon - lon;
        if (diff < -180) diff += 360; // crossed 0
        if (diff > 180) diff -= 360;

        // The sun and moon are never retrograde in reality
        const retrograde = (id !== "sun" && id !== "moon") ? diff < 0 : false;

        const sign = eclipticLongitudeToSign(lon);

        planets.push({
            id,
            longitude: lon,
            signId: sign.id,
            houseId: getHouseId(lon),
            retrograde
        });
    };

    addPlanet("sun", Astronomy.Body.Sun);
    addPlanet("moon", Astronomy.Body.Moon);
    addPlanet("mercury", Astronomy.Body.Mercury);
    addPlanet("venus", Astronomy.Body.Venus);
    addPlanet("mars", Astronomy.Body.Mars);
    addPlanet("jupiter", Astronomy.Body.Jupiter);
    addPlanet("saturn", Astronomy.Body.Saturn);
    addPlanet("uranus", Astronomy.Body.Uranus);
    addPlanet("neptune", Astronomy.Body.Neptune);
    addPlanet("pluto", Astronomy.Body.Pluto); // Note: astronomy-engine uses simple model for pluto, good enough for most uses

    // 5. Aspects
    const aspects: ChartAspect[] = calculateAspects(planets);

    return {
        planets,
        houses,
        aspects,
        ascendant
    };
}
