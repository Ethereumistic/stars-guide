/**
 * Geocoding service using OpenStreetMap's Nominatim API
 * 100% free, no API key required
 */

export interface GeocodingResult {
    lat: number;
    long: number;
    city: string;
    country: string;
    countryCode?: string;
}

interface NominatimResponse {
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    address: {
        city?: string;
        town?: string;
        village?: string;
        municipality?: string;
        suburb?: string;
        city_district?: string;
        region?: string;
        county?: string;
        state?: string;
        country: string;
        country_code: string;
    };
    type: string;
    importance: number;
}

/**
 * Search for locations using Nominatim autocomplete
 * @param query - User's search input (e.g., "Los Angeles")
 * @param limit - Maximum number of results (default: 8)
 */
export async function searchLocations(
    query: string,
    limit: number = 8
): Promise<GeocodingResult[]> {
    if (!query || query.length < 2) {
        return [];
    }

    try {
        const params = new URLSearchParams({
            q: query,
            format: 'json',
            addressdetails: '1',
            limit: limit.toString(),
            'accept-language': 'en',
            featuretype: 'settlement', // Prioritize cities/towns/villages
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            {
                headers: {
                    'User-Agent': 'stars.guide/1.0 (https://stars.guide)',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data: NominatimResponse[] = await response.json();

        // Map and deduplicate by city + country
        const uniqueResults = new Map<string, GeocodingResult>();

        data.forEach((result) => {
            const city = extractCityName(result);
            const country = result.address.country || "";
            const countryCode = result.address.country_code || "";
            const key = `${city}-${country}`.toLowerCase();

            // Only add if not already present, ensuring we keep the most "important" result
            if (!uniqueResults.has(key)) {
                uniqueResults.set(key, {
                    lat: parseFloat(result.lat),
                    long: parseFloat(result.lon),
                    city: city,
                    country: country,
                    countryCode: countryCode,
                });
            }
        });

        return Array.from(uniqueResults.values());
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

/**
 * Reverse geocode: Convert coordinates to address
 */
export async function reverseGeocode(
    lat: number,
    long: number
): Promise<GeocodingResult | null> {
    try {
        const params = new URLSearchParams({
            lat: lat.toString(),
            lon: long.toString(),
            format: 'json',
            addressdetails: '1',
            'accept-language': 'en',
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?${params}`,
            {
                headers: {
                    'User-Agent': 'stars.guide/1.0 (https://stars.guide)',
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data: NominatimResponse = await response.json();

        return {
            lat: parseFloat(data.lat),
            long: parseFloat(data.lon),
            city: extractCityName(data),
            country: data.address.country || "",
            countryCode: data.address.country_code || "",
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Extract city name from Nominatim response
 * We prioritize the most specific "settlement" name
 */
function extractCityName(result: NominatimResponse): string {
    const { address, display_name } = result;

    // Check preferred fields in order
    const priority = [
        address.city,
        address.town,
        address.village,
        address.municipality,
        address.suburb,
        address.city_district,
        address.region,
        address.county
    ];

    for (const name of priority) {
        if (name && name.toLowerCase() !== 'unknown') return name;
    }

    // High-performance fallback: the display_name usually starts with the most specific location name
    // e.g., "Gabrovo, Province of Gabrovo, Bulgaria" -> "Gabrovo"
    const firstPart = display_name.split(',')[0].trim();
    if (firstPart && firstPart.toLowerCase() !== 'unknown') return firstPart;

    return 'Unknown Location';
}

/**
 * Get user's current location using browser Geolocation API
 * then reverse geocode to get city name
 */
export async function getUserCurrentLocation(): Promise<GeocodingResult | null> {
    return new Promise((resolve) => {
        if (typeof window === 'undefined' || !navigator.geolocation) {
            console.error('Geolocation not supported');
            resolve(null);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                const location = await reverseGeocode(latitude, longitude);
                resolve(location);
            },
            (error) => {
                console.error('Geolocation error:', error);
                resolve(null);
            },
            { enableHighAccuracy: true, timeout: 5000 }
        );
    });
}
