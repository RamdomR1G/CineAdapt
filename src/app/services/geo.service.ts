import { Injectable } from '@angular/core';
import { Geolocation } from '@capacitor/geolocation';
import tzlookup from 'tz-lookup';
import { LocationInfo } from '../models/location-info';

/**
 * Lee el GPS (Capacitor usa navigator.geolocation en la web) y lo convierte a zona horaria
 * sin salir del dispositivo (tz-lookup trabaja offline). Las coordenadas NO se envian a ningun servidor.
 */
@Injectable({ providedIn: 'root' })
export class GeoService {
  async readLocation(): Promise<LocationInfo> {
    if (!('geolocation' in navigator)) return LocationInfo.fallback('unavailable');
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 });
      const { latitude, longitude, accuracy } = pos.coords;
      return new LocationInfo('granted', tzlookup(latitude, longitude), latitude, longitude, accuracy);
    } catch (e: any) {
      const denied = e?.code === 1 || /denied/i.test(e?.message ?? '');
      return LocationInfo.fallback(denied ? 'denied' : 'unavailable');
    }
  }
}
