/**
 * Verifies Google ID tokens (JWTs) using Google's public JWKS.
 *
 * Used by the GoogleOneTap ConvexCredentials provider to validate
 * credentials received from Google Identity Services on the client.
 */

interface GoogleIdTokenPayload {
  sub: string;
  email: string;
  email_verified: boolean;
  name: string;
  picture: string;
  given_name?: string;
  family_name?: string;
  locale?: string;
  iss: string;
  aud: string;
  exp: number;
  iat: number;
  azp?: string;
}

interface JwkKey {
  kty: string;
  kid: string;
  alg: string;
  use: string;
  n: string;
  e: string;
}

let cachedKeys: JwkKey[] | null = null;
let keysExpiry = 0;

function base64urlDecode(str: string): Uint8Array {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function getGoogleKeys(): Promise<JwkKey[]> {
  if (cachedKeys && Date.now() < keysExpiry) {
    return cachedKeys;
  }

  const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
  if (!response.ok) {
    throw new Error(`Failed to fetch Google JWKS: ${response.status}`);
  }

  const data = (await response.json()) as { keys: JwkKey[] };
  cachedKeys = data.keys;
  keysExpiry = Date.now() + 60 * 60 * 1000; // Cache for 1 hour
  return cachedKeys;
}

async function importRsaKey(jwk: JwkKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk",
    {
      kty: jwk.kty,
      kid: jwk.kid,
      alg: jwk.alg,
      use: jwk.use,
      n: jwk.n,
      e: jwk.e,
    } as JsonWebKey,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
}

/**
 * Verify a Google ID token (JWT) and return its payload.
 *
 * Validates signature, issuer, audience, and expiration.
 */
export async function verifyGoogleIdToken(
  idToken: string,
  expectedClientId: string,
): Promise<GoogleIdTokenPayload | null> {
  try {
    const parts = idToken.split(".");
    if (parts.length !== 3) return null;

    const [headerB64, payloadB64, signatureB64] = parts;

    // Decode header to get the key ID
    const headerBytes = base64urlDecode(headerB64);
    const header = JSON.parse(new TextDecoder().decode(headerBytes));

    // Decode and validate payload first (cheap check)
    const payloadBytes = base64urlDecode(payloadB64);
    const payload: GoogleIdTokenPayload = JSON.parse(
      new TextDecoder().decode(payloadBytes),
    );

    // Check expiration (tolerate 30 s clock skew)
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now - 30) return null;

    // Check issuer
    if (
      payload.iss !== "accounts.google.com" &&
      payload.iss !== "https://accounts.google.com"
    ) {
      return null;
    }

    // Check audience
    if (payload.aud !== expectedClientId) return null;

    // Fetch Google's signing keys & find the matching one
    const keys = await getGoogleKeys();
    const matchingKey = keys.find((k) => k.kid === header.kid);
    if (!matchingKey) return null;

    // Import the key & verify the signature
    const cryptoKey = await importRsaKey(matchingKey);

    const signatureData = base64urlDecode(signatureB64);
    const signedData = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    const valid = await crypto.subtle.verify(
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      cryptoKey,
      signatureData.buffer as ArrayBuffer,
      signedData,
    );

    if (!valid) return null;

    return payload;
  } catch (error) {
    console.error("Google ID token verification failed:", error);
    return null;
  }
}