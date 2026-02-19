// ============================================
// EXIF.JS — Reading EXIF metadata from photos
// Extracts date, GPS (lat/lon) with no dependencies
// ============================================

/**
 * Reads EXIF metadata from an image file.
 * Returns { date: "2025-12-24", lat: 19.432, lon: -99.133 } or null fields if no data.
 */
export async function readExifData(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const result = parseExif(new Uint8Array(e.target.result));
                resolve(result);
            } catch (err) {
                console.warn('EXIF parse error:', err);
                resolve({ date: null, lat: null, lon: null });
            }
        };
        reader.onerror = () => resolve({ date: null, lat: null, lon: null });
        // Only read the first 128KB (EXIF data is at the beginning)
        reader.readAsArrayBuffer(file.slice(0, 131072));
    });
}

function parseExif(data) {
    const result = { date: null, lat: null, lon: null };

    // Check JPEG (FFD8)
    if (data[0] !== 0xFF || data[1] !== 0xD8) return result;

    let offset = 2;
    while (offset < data.length - 1) {
        if (data[offset] !== 0xFF) break;

        const marker = data[offset + 1];
        // APP1 marker (EXIF)
        if (marker === 0xE1) {
            const length = (data[offset + 2] << 8) | data[offset + 3];
            const exifData = data.slice(offset + 4, offset + 2 + length);
            return parseExifBlock(exifData);
        }

        // Skip other markers
        if (marker === 0xD8 || marker === 0xD9) {
            offset += 2;
        } else {
            const segLen = (data[offset + 2] << 8) | data[offset + 3];
            offset += 2 + segLen;
        }
    }

    return result;
}

function parseExifBlock(data) {
    const result = { date: null, lat: null, lon: null };

    // Verify "Exif\0\0" header
    const exifHeader = String.fromCharCode(...data.slice(0, 4));
    if (exifHeader !== 'Exif') return result;

    const tiffOffset = 6;
    const littleEndian = data[tiffOffset] === 0x49; // "II" = little endian

    function readU16(pos) {
        const p = tiffOffset + pos;
        if (p + 1 >= data.length) return 0;
        return littleEndian
            ? data[p] | (data[p + 1] << 8)
            : (data[p] << 8) | data[p + 1];
    }

    function readU32(pos) {
        const p = tiffOffset + pos;
        if (p + 3 >= data.length) return 0;
        return littleEndian
            ? (data[p] | (data[p + 1] << 8) | (data[p + 2] << 16) | (data[p + 3] << 24)) >>> 0
            : ((data[p] << 24) | (data[p + 1] << 16) | (data[p + 2] << 8) | data[p + 3]) >>> 0;
    }

    function readString(pos, length) {
        let str = '';
        for (let i = 0; i < length; i++) {
            const c = data[tiffOffset + pos + i];
            if (c === 0) break;
            str += String.fromCharCode(c);
        }
        return str;
    }

    function readRational(pos) {
        const num = readU32(pos);
        const den = readU32(pos + 4);
        return den ? num / den : 0;
    }

    function parseIFD(ifdOffset) {
        const count = readU16(ifdOffset);
        let gpsIFDOffset = null;
        let exifIFDOffset = null;

        for (let i = 0; i < count; i++) {
            const entryOffset = ifdOffset + 2 + (i * 12);
            const tag = readU16(entryOffset);
            const type = readU16(entryOffset + 2);
            const numValues = readU32(entryOffset + 4);
            const valueOffset = readU32(entryOffset + 8);

            // DateTimeOriginal (0x9003) or DateTime (0x0132)
            if (tag === 0x0132 || tag === 0x9003) {
                const strOffset = numValues > 4 ? valueOffset : (entryOffset + 8);
                const dateStr = readString(strOffset, 19);
                // Format: "2025:12:24 14:30:00" → "2025-12-24"
                if (dateStr && /^\d{4}[:\-]\d{2}[:\-]\d{2}/.test(dateStr)) {
                    result.date = dateStr.substring(0, 10).replace(/:/g, '-');
                }
            }

            // GPS IFD pointer (0x8825)
            if (tag === 0x8825) {
                gpsIFDOffset = valueOffset;
            }

            // EXIF IFD pointer (0x8769)
            if (tag === 0x8769) {
                exifIFDOffset = valueOffset;
            }
        }

        // Parse EXIF sub-IFD for DateTimeOriginal
        if (exifIFDOffset) {
            const exifCount = readU16(exifIFDOffset);
            for (let i = 0; i < exifCount; i++) {
                const entryOffset = exifIFDOffset + 2 + (i * 12);
                const tag = readU16(entryOffset);
                const numValues = readU32(entryOffset + 4);
                const valueOffset = readU32(entryOffset + 8);

                // DateTimeOriginal (0x9003) — more accurate than DateTime
                if (tag === 0x9003) {
                    const strOffset = numValues > 4 ? valueOffset : (entryOffset + 8);
                    const dateStr = readString(strOffset, 19);
                    if (dateStr && /^\d{4}[:\-]\d{2}[:\-]\d{2}/.test(dateStr)) {
                        result.date = dateStr.substring(0, 10).replace(/:/g, '-');
                    }
                }
            }
        }

        // Parse GPS IFD
        if (gpsIFDOffset) {
            const gpsCount = readU16(gpsIFDOffset);
            let latRef = 'N', lonRef = 'E';
            let latData = null, lonData = null;

            for (let i = 0; i < gpsCount; i++) {
                const entryOffset = gpsIFDOffset + 2 + (i * 12);
                const tag = readU16(entryOffset);
                const valueOffset = readU32(entryOffset + 8);

                if (tag === 1) { // GPSLatitudeRef
                    latRef = String.fromCharCode(data[tiffOffset + entryOffset + 8]);
                }
                if (tag === 2) { // GPSLatitude (3 rationals)
                    latData = valueOffset;
                }
                if (tag === 3) { // GPSLongitudeRef
                    lonRef = String.fromCharCode(data[tiffOffset + entryOffset + 8]);
                }
                if (tag === 4) { // GPSLongitude (3 rationals)
                    lonData = valueOffset;
                }
            }

            if (latData !== null) {
                const deg = readRational(latData);
                const min = readRational(latData + 8);
                const sec = readRational(latData + 16);
                result.lat = (deg + min / 60 + sec / 3600) * (latRef === 'S' ? -1 : 1);
            }
            if (lonData !== null) {
                const deg = readRational(lonData);
                const min = readRational(lonData + 8);
                const sec = readRational(lonData + 16);
                result.lon = (deg + min / 60 + sec / 3600) * (lonRef === 'W' ? -1 : 1);
            }
        }
    }

    // Read first IFD
    const ifdOffset = readU32(4);
    if (ifdOffset < 8 || ifdOffset > data.length) return result;
    parseIFD(ifdOffset);

    // Validate GPS ranges
    if (result.lat !== null && (result.lat < -90 || result.lat > 90)) result.lat = null;
    if (result.lon !== null && (result.lon < -180 || result.lon > 180)) result.lon = null;
    if (result.lat === null || result.lon === null) { result.lat = null; result.lon = null; }

    return result;
}

/**
 * Converts GPS coordinates to a place name using the free Nominatim API.
 */
export async function reverseGeocode(lat, lon) {
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=14&accept-language=en`);
        if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            // Build short name: "Neighborhood, City" or "City, Country"
            const parts = [
                addr.suburb || addr.neighbourhood || addr.quarter || '',
                addr.city || addr.town || addr.village || addr.municipality || '',
                addr.state || ''
            ].filter(Boolean);
            return parts.slice(0, 2).join(', ') || data.display_name?.split(',').slice(0, 2).join(',') || '';
        }
    } catch (e) { console.warn('Geocode error:', e); }
    return '';
}
