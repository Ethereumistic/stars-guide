import * as Astronomy from 'astronomy-engine';

const date = new Date('1998-05-17T14:34:00Z');
const bodies = [
    Astronomy.Body.Mercury,
    Astronomy.Body.Venus,
    Astronomy.Body.Mars,
    Astronomy.Body.Jupiter,
    Astronomy.Body.Saturn,
    Astronomy.Body.Uranus,
    Astronomy.Body.Neptune,
    Astronomy.Body.Pluto
];

for (const body of bodies) {
    const geoPos = Astronomy.GeoVector(body, date, true); // true for aberration
    const eclPos = Astronomy.Ecliptic(geoPos);
    console.log(`${body}: lon=${eclPos.elon.toFixed(2)}, lat=${eclPos.elat.toFixed(2)}`);
}
// Sun is separate
const sunPos = Astronomy.SunPosition(date);
console.log(`Sun: lon=${sunPos.elon.toFixed(2)}`);

// Moon is separate
const moonPos = Astronomy.EclipticGeoMoon(date);
console.log(`Moon: lon=${moonPos.lon.toFixed(2)}, lat=${moonPos.lat.toFixed(2)}`);
