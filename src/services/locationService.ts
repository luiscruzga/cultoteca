import { Platform } from 'react-native';
import * as Location from 'expo-location';

/** Posición del dispositivo con una etiqueta legible (ciudad o coordenadas). */
export interface DeviceLocation {
  lat: number;
  lon: number;
  label: string;
}

export type DeviceLocationResult =
  | { status: 'ok'; location: DeviceLocation }
  | { status: 'denied' }
  | { status: 'unavailable' };

const formatCoordinates = (lat: number, lon: number) => `${lat.toFixed(3)}, ${lon.toFixed(3)}`;

/** Ciudad (o región) de unas coordenadas; en web no hay geocodificador inverso. */
const describeLocation = async (lat: number, lon: number): Promise<string> => {
  if (Platform.OS === 'web') return formatCoordinates(lat, lon);
  try {
    const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lon });
    const city = place?.city || place?.subregion || place?.district || place?.region;
    if (!city) return formatCoordinates(lat, lon);
    const region = place?.region && place.region !== city ? place.region : place?.country;
    return region ? `${city}, ${region}` : city;
  } catch {
    return formatCoordinates(lat, lon);
  }
};

/**
 * Pide permiso de ubicación en primer plano y devuelve la posición actual con precisión media
 * (suficiente para buscar eventos en un radio de kilómetros).
 */
export const getCurrentDeviceLocation = async (): Promise<DeviceLocationResult> => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return { status: 'denied' };
    const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    const { latitude: lat, longitude: lon } = position.coords;
    return { status: 'ok', location: { lat, lon, label: await describeLocation(lat, lon) } };
  } catch (error) {
    console.warn('[locationService] No se pudo obtener la ubicación:', error);
    return { status: 'unavailable' };
  }
};
