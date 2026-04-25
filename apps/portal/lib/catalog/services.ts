export type ServiceId =
  | 'antecedentes_penales'
  | 'antecedentes_policiales'
  | 'renap'
  | 'minex';

export interface Service {
  id: ServiceId;
  name: string;
  description: string;
  priceGTQ: number;
  processingDays: number;
  available: boolean;
}

export const SERVICE_CATALOG: Record<ServiceId, Service> = {
  antecedentes_penales: {
    id: 'antecedentes_penales',
    name: 'Antecedentes Penales',
    description:
      'Criminal background check from Guatemalan national registry',
    priceGTQ: 95,
    processingDays: 3,
    available: true,
  },
  antecedentes_policiales: {
    id: 'antecedentes_policiales',
    name: 'Antecedentes Policiales',
    description:
      'Police background check from Guatemalan national registry',
    priceGTQ: 85,
    processingDays: 2,
    available: true,
  },
  renap: {
    id: 'renap',
    name: 'Certificado de Nacimiento (RENAP)',
    description: 'Birth certificate from RENAP (Registro Nacional de Personas)',
    priceGTQ: 125,
    processingDays: 5,
    available: false,
  },
  minex: {
    id: 'minex',
    name: 'MINEX Apostillado',
    description: 'Apostille certification for international documents',
    priceGTQ: 150,
    processingDays: 7,
    available: false,
  },
};

export function getAvailableServices(): Service[] {
  return Object.values(SERVICE_CATALOG).filter((service) => service.available);
}

export function getServiceById(id: ServiceId): Service | undefined {
  return SERVICE_CATALOG[id];
}

export function getServicePrice(id: ServiceId): number | null {
  const service = getServiceById(id);
  if (!service || !service.available) {
    return null;
  }
  return service.priceGTQ;
}
