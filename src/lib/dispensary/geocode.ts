export interface Coordinates {
  lat: number;
  lng: number;
}

const MOCK_CITIES: Record<string, Coordinates> = {
  "seattle, wa": { lat: 47.6062, lng: -122.3321 },
  "san francisco, ca": { lat: 37.7749, lng: -122.4194 },
  "los angeles, ca": { lat: 34.0522, lng: -118.2437 },
  "portland, or": { lat: 45.5152, lng: -122.6784 },
};

export async function geocodeAddress(address: string): Promise<Coordinates> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    const normalized = address.toLowerCase().trim();
    for (const [city, coords] of Object.entries(MOCK_CITIES)) {
      if (normalized.includes(city)) return coords;
    }
    return { lat: 45.5152, lng: -122.6784 }; // Fallback Portland coordinates
  }

  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${apiKey}`
    );
    const data = await res.json();
    if (data.results && data.results[0]) {
      const { lat, lng } = data.results[0].geometry.location;
      return { lat, lng };
    }
  } catch (e) {
    console.error("Geocoding failed, falling back to default coords", e);
  }
  return { lat: 45.5152, lng: -122.6784 };
}
