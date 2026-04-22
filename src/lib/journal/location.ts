/**
 * location.ts — Browser geolocation wrapper + reverse geocoding via Nominatim.
 *
 * Uses navigator.geolocation for coordinates and Nominatim (free, no key)
 * for reverse geocoding. Caches last-used location in localStorage.
 */

export interface LocationData {
    lat: number;
    long: number;
    city?: string;
    country?: string;
    displayName?: string;
}

const CACHE_KEY = "journal_last_location";
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 min

interface CachedLocation {
    data: LocationData;
    timestamp: number;
}

/**
 * Check if geolocation is available in this browser.
 */
export function isGeolocationSupported(): boolean {
    if (typeof window === "undefined") return false;
    return !!navigator.geolocation;
}

/**
 * Get the current position from the browser.
 * Returns lat/long or null if denied/unavailable.
 */
export async function getCurrentPosition(): Promise<{ lat: number; long: number } | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                resolve({
                    lat: position.coords.latitude,
                    long: position.coords.longitude,
                });
            },
            () => {
                resolve(null);
            },
            {
                enableHighAccuracy: false,
                timeout: 10000,
                maximumAge: 60000,
            },
        );
    });
}

/**
 * Reverse-geocode lat/long to a city + country using Nominatim (free, no API key).
 * Rate-limited to 1 request/second by Nominatim policy.
 */
export async function reverseGeocode(
    lat: number,
    long: number,
): Promise<{ city?: string; country?: string; displayName?: string }> {
    try {
        const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${long}&format=json&zoom=10`;
        const response = await fetch(url, {
            headers: {
                "User-Agent": "stars-guide-journal/1.0",
            },
        });

        if (!response.ok) return {};

        const data = await response.json() as any;
        const city = data.address?.city ?? data.address?.town ?? data.address?.village ?? data.address?.county;
        const country = data.address?.country;
        const displayName = city && country ? `${city}, ${country}` : city ?? country ?? undefined;

        return { city, country, displayName };
    } catch {
        return {};
    }
}

/**
 * Get the current location with reverse geocoding.
 * Uses cached result if recent enough.
 */
export async function getCurrentLocation(): Promise<LocationData | null> {
    // Check cache first
    const cached = getCachedLocation();
    if (cached) return cached;

    const position = await getCurrentPosition();
    if (!position) return null;

    const geo = await reverseGeocode(position.lat, position.long);

    const location: LocationData = {
        lat: position.lat,
        long: position.long,
        city: geo.city,
        country: geo.country,
        displayName: geo.displayName,
    };

    // Cache
    cacheLocation(location);

    return location;
}

/**
 * Format location for display.
 */
export function formatLocationDisplay(location: { city?: string; country?: string; displayName?: string }): string {
    if (location.displayName) return location.displayName;
    if (location.city && location.country) return `${location.city}, ${location.country}`;
    if (location.city) return location.city;
    if (location.country) return location.country;
    return "Unknown location";
}

// ── Cache helpers ──────────────────────────────────────────────────────

function getCachedLocation(): LocationData | null {
    try {
        const raw = localStorage.getItem(CACHE_KEY);
        if (!raw) return null;
        const cached: CachedLocation = JSON.parse(raw);
        if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
            localStorage.removeItem(CACHE_KEY);
            return null;
        }
        return cached.data;
    } catch {
        return null;
    }
}

function cacheLocation(location: LocationData): void {
    try {
        const cached: CachedLocation = { data: location, timestamp: Date.now() };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cached));
    } catch {
        // localStorage unavailable — skip caching
    }
}