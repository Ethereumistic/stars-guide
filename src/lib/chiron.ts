import { CHIRON_TABLE } from "@/data/chironEphemeris";

const r2 = (n: number) => Math.round(n * 100) / 100;

export function getChironForDate(date: Date): {
  longitude: number;
  retrograde: boolean;
} {
  const year  = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day   = date.getUTCDate();

  // Find the two surrounding monthly samples
  const before = CHIRON_TABLE.find(
    (e) => e.year === year && e.month === month
  );

  const afterMonth = month === 12 ? 1 : month + 1;
  const afterYear  = month === 12 ? year + 1 : year;
  const after = CHIRON_TABLE.find(
    (e) => e.year === afterYear && e.month === afterMonth
  );

  if (!before || !after) {
    throw new Error(
      `Chiron table does not cover date: ${date.toISOString().substring(0, 10)}. Table range is 1900–2050.`
    );
  }

  // Linear interpolation based on day of month
  const daysInMonth = new Date(year, month, 0).getDate();
  const t = (day - 1) / daysInMonth; // 0.0 on the 1st, ~1.0 on the last day

  // Handle 0°/360° wrap-around
  let delta = after.lon - before.lon;
  if (delta >  180) delta -= 360;
  if (delta < -180) delta += 360;

  const longitude = r2(((before.lon + t * delta) + 360) % 360);

  // Retrograde: use the "before" sample's flag
  // (Chiron changes retrograde status slowly — monthly resolution is fine)
  return { longitude, retrograde: before.retrograde };
}
