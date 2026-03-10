import * as Astronomy from 'astronomy-engine';
import { eclipticLongitudeToSign } from '@/lib/birth-chart/core';
import { getChironForDate } from '@/lib/chiron';
import { calculateAscendingNodeLongitude } from '@/lib/birth-chart/full-chart';

export interface PlanetTelemetry {
    longitude: number;
    signId: string;
    retrograde: boolean;
    distanceAu: number | null; // Distance from Earth in Astronomical Units
}

/**
 * Gets real-time telemetry for a single planetary body.
 * Used for the Planet Hub to display "Live Telemetry"
 */
export function getPlanetTelemetry(planetId: string, targetDate: Date = new Date()): PlanetTelemetry | null {
    const id = planetId.toLowerCase();

    // Special points not in Astronomy Engine body enum
    if (id === 'chiron') {
        const chironData = getChironForDate(targetDate);
        return {
            longitude: chironData.longitude,
            signId: eclipticLongitudeToSign(chironData.longitude).id,
            retrograde: chironData.retrograde,
            distanceAu: null,
        };
    }

    if (id === 'north_node' || id === 'south_node') {
        let lon = calculateAscendingNodeLongitude(targetDate);
        if (id === 'south_node') lon = (lon + 180) % 360;
        
        let futureLon = calculateAscendingNodeLongitude(new Date(targetDate.getTime() + 1000 * 60 * 60 * 24)); // 1 day future for better resolution
        if (id === 'south_node') futureLon = (futureLon + 180) % 360;
        
        let diff = futureLon - lon;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;
        const retrograde = diff < 0;

        return {
            longitude: lon,
            signId: eclipticLongitudeToSign(lon).id,
            retrograde,
            distanceAu: null,
        };
    }

    // Maps planet ID to the Astronomy-Engine Body
    const bodyMap: Record<string, Astronomy.Body> = {
        sun: Astronomy.Body.Sun,
        moon: Astronomy.Body.Moon,
        mercury: Astronomy.Body.Mercury,
        venus: Astronomy.Body.Venus,
        mars: Astronomy.Body.Mars,
        jupiter: Astronomy.Body.Jupiter,
        saturn: Astronomy.Body.Saturn,
        uranus: Astronomy.Body.Uranus,
        neptune: Astronomy.Body.Neptune,
        pluto: Astronomy.Body.Pluto,
    };

    const body = bodyMap[id];
    if (!body) return null;

    let eclipticLon = 0;

    // Calculate longitude
    if (body === Astronomy.Body.Sun) {
        eclipticLon = Astronomy.SunPosition(targetDate).elon;
    } else if (body === Astronomy.Body.Moon) {
        eclipticLon = Astronomy.EclipticGeoMoon(targetDate).lon;
    } else {
        const geoVector = Astronomy.GeoVector(body, targetDate, true);
        eclipticLon = Astronomy.Ecliptic(geoVector).elon;
    }
    const lon = (eclipticLon + 360) % 360;
    const sign = eclipticLongitudeToSign(lon);

    // Calculate retrograde (Sun and Moon are never retrograde)
    let retrograde = false;
    if (body !== Astronomy.Body.Sun && body !== Astronomy.Body.Moon) {
        // Check 1 minute into the future
        const futureDate = new Date(targetDate.getTime() + 1000 * 60);
        const geoVectorFuture = Astronomy.GeoVector(body, futureDate, true);
        const futureLon = (Astronomy.Ecliptic(geoVectorFuture).elon + 360) % 360;

        let diff = futureLon - lon;
        if (diff < -180) diff += 360;
        if (diff > 180) diff -= 360;

        retrograde = diff < 0;
    }

    // Calculate Geocentric distance in AU
    let distanceAu: number | null = null;
    if (body === Astronomy.Body.Sun) {
        const obs = new Astronomy.Observer(0, 0, 0); // Center of earth approximation
        distanceAu = Astronomy.Equator(body, targetDate, obs, true, true).dist;
    } else if (body === Astronomy.Body.Moon) {
        const obs = new Astronomy.Observer(0, 0, 0);
        distanceAu = Astronomy.Equator(body, targetDate, obs, true, true).dist;
    } else {
        const geoVector = Astronomy.GeoVector(body, targetDate, true);
        // Calculate the vector length to get distance in AU
        distanceAu = Math.sqrt(geoVector.x * geoVector.x + geoVector.y * geoVector.y + geoVector.z * geoVector.z);
    }

    return {
        longitude: lon,
        signId: sign.id,
        retrograde,
        distanceAu
    };
}
