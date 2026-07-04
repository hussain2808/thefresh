// Mirrors api/prisma/schema.prisma — delivery module v2 (docs/delivery-design.md).

export interface Country {
  id: string;
  name: string;
  code: string;
  active: boolean;
  _count?: { cities: number };
}

export interface City {
  id: string;
  countryId: string;
  name: string;
  active: boolean;
  country?: Country;
  _count?: { zones: number };
}

export interface Zone {
  id: string;
  cityId: string;
  name: string;
  active: boolean;
  city?: City;
  areas?: Area[];
  methodZones?: DeliveryMethodZone[];
  _count?: { areas: number; methodZones: number };
}

export interface Area {
  id: string;
  zoneId: string;
  name: string;
  active: boolean;
  zone?: Zone;
}

export interface DeliveryMethodZone {
  id: string;
  deliveryMethodId: string;
  zoneId: string;
  zone?: Zone;
  deliveryMethod?: DeliveryMethod;
}

export interface DeliveryMethod {
  id: string;
  name: string;
  code: string;
  description: string | null;
  active: boolean;
  feeFils: number;
  minimumOrderAmountFils: number;
  freeDeliveryAboveFils: number | null;
  estimatedDeliveryMinutes: number | null;
  zones?: DeliveryMethodZone[];
  _count?: { slots: number };
}

export interface DeliverySlot {
  id: string;
  deliveryMethodId: string;
  zoneId: string | null;
  zone?: Zone | null;
  name: string | null;
  startMinute: number;
  endMinute: number;
  capacity: number;
  bookedCount: number;
  active: boolean;
}

export function formatMinutes(minutes: number): string {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}
