import * as Astronomy from 'astronomy-engine';
import { AspectData, compositionalAspects } from '@/astrology/aspects';
import { compositionalPlanets, PlanetData } from '@/astrology/planets';

export const ASTRO_BODIES = [
    { id: "sun", body: Astronomy.Body.Sun },
    { id: "moon", body: Astronomy.Body.Moon },
    { id: "mercury", body: Astronomy.Body.Mercury },
    { id: "venus", body: Astronomy.Body.Venus },
    { id: "mars", body: Astronomy.Body.Mars },
    { id: "jupiter", body: Astronomy.Body.Jupiter },
    { id: "saturn", body: Astronomy.Body.Saturn },
    { id: "uranus", body: Astronomy.Body.Uranus },
    { id: "neptune", body: Astronomy.Body.Neptune },
    { id: "pluto", body: Astronomy.Body.Pluto },
];

export function getEclipticLongitude(body: Astronomy.Body, date: Date): number {
    if (body === Astronomy.Body.Sun) {
        return Astronomy.SunPosition(date).elon;
    } else if (body === Astronomy.Body.Moon) {
        return Astronomy.EclipticGeoMoon(date).lon;
    } else {
        return Astronomy.Ecliptic(Astronomy.GeoVector(body, date, true)).elon;
    }
}

export interface ActiveAspect {
    planet1: PlanetData;
    planet2: PlanetData;
    aspect: AspectData;
    orb: number;
    applying: boolean;
    exactAngle: number;
    currentAngle: number;
}

export function getActiveAspects(date: Date, aspectId?: string): ActiveAspect[] {
    const active: ActiveAspect[] = [];

    // Future date for applying/separating check (1 hour)
    const futureDate = new Date(date.getTime() + 1000 * 60 * 60);

    const positions = ASTRO_BODIES.map(b => ({
        id: b.id,
        planet: compositionalPlanets.find(p => p.id === b.id)!,
        lon: (getEclipticLongitude(b.body, date) + 360) % 360,
        futureLon: (getEclipticLongitude(b.body, futureDate) + 360) % 360
    }));

    for (let i = 0; i < positions.length; i++) {
        for (let j = i + 1; j < positions.length; j++) {
            const p1 = positions[i];
            const p2 = positions[j];

            let diff = Math.abs(p1.lon - p2.lon);
            if (diff > 180) diff = 360 - diff;

            let futureDiff = Math.abs(p1.futureLon - p2.futureLon);
            if (futureDiff > 180) futureDiff = 360 - futureDiff;

            for (const ac of compositionalAspects) {
                if (aspectId && ac.id !== aspectId) continue;

                const orb = Math.abs(diff - ac.degrees);

                // For real-time active transits, we use a tight maximum orb threshold
                // to avoid showing too many loose aspects. A value of 3 degrees is good.
                const maxOrb = Math.max(ac.orb.tight, 3);

                if (orb <= maxOrb) {
                    const futureOrb = Math.abs(futureDiff - ac.degrees);
                    const applying = futureOrb < orb;

                    active.push({
                        planet1: p1.planet,
                        planet2: p2.planet,
                        aspect: ac,
                        orb,
                        applying,
                        exactAngle: ac.degrees,
                        currentAngle: diff
                    });
                }
            }
        }
    }

    // Sort by tightest orb
    return active.sort((a, b) => a.orb - b.orb);
}
