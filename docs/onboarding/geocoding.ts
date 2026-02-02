// src/lib/geocoding.ts
/**
 * Geocoding service using OpenStreetMap's Nominatim API
 * 100% free, no API key required
 */

export interface GeocodingResult {
    lat: number;
    long: number;
    city: string;
    country: string;
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
        county?: string;
        state?: string;
        country: string;
    };
    type: string;
    importance: number;
}

/**
 * Search for locations using Nominatim autocomplete
 * @param query - User's search input (e.g., "Los Angeles")
 * @param limit - Maximum number of results (default: 5)
 */
export async function searchLocations(
    query: string,
    limit: number = 5
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
            'accept-language': 'en', // Force English results
        });

        const response = await fetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            {
                headers: {
                    'User-Agent': 'stars.guide/1.0 (https://stars.guide)', // Required by Nominatim
                },
            }
        );

        if (!response.ok) {
            throw new Error(`Nominatim API error: ${response.status}`);
        }

        const data: NominatimResponse[] = await response.json();

        return data
            .filter((result) => {
                // Filter out non-city results (e.g., streets, buildings)
                const validTypes = ['city', 'town', 'village', 'municipality', 'administrative'];
                return validTypes.includes(result.type);
            })
            .map((result) => ({
                lat: parseFloat(result.lat),
                long: parseFloat(result.lon),
                city: extractCityName(result.address),
                country: result.address.country,
            }));
    } catch (error) {
        console.error('Geocoding error:', error);
        return [];
    }
}

/**
 * Reverse geocode: Convert coordinates to address
 * Useful for "Use my current location" feature
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
            city: extractCityName(data.address),
            country: data.address.country,
        };
    } catch (error) {
        console.error('Reverse geocoding error:', error);
        return null;
    }
}

/**
 * Extract city name from Nominatim address object
 * Handles various address formats (city, town, village, etc.)
 */
function extractCityName(address: NominatimResponse['address']): string {
    return (
        address.city ||
        address.town ||
        address.village ||
        address.municipality ||
        address.county ||
        'Unknown'
    );
}

/**
 * Get user's current location using browser Geolocation API
 * then reverse geocode to get city name
 */
export async function getUserCurrentLocation(): Promise<GeocodingResult | null> {
    return new Promise((resolve) => {
        if (!navigator.geolocation) {
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
            }
        );
    });
}