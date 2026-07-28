/**
 * Karachi neighbourhood presets for the agent location step.
 * Coordinates stay inside KARACHI_BOUNDS used by backend validation.
 */
export interface KarachiArea {
  area: string;
  lat: number;
  lng: number;
}

export const KARACHI_AREAS: KarachiArea[] = [
  { area: 'Gulshan-e-Iqbal', lat: 24.9213, lng: 67.0871 },
  { area: 'Gulistan-e-Johar', lat: 24.9156, lng: 67.1301 },
  { area: 'PECHS', lat: 24.8721, lng: 67.0645 },
  { area: 'DHA', lat: 24.7985, lng: 67.045 },
  { area: 'Clifton', lat: 24.8125, lng: 67.0301 },
  { area: 'North Nazimabad', lat: 24.9412, lng: 67.0389 },
  { area: 'Bahadurabad', lat: 24.8785, lng: 67.0712 },
  { area: 'Malir', lat: 24.8935, lng: 67.1902 },
];
