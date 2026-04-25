import { getAvailableServices } from '@/lib/catalog/services';

export async function GET() {
  const services = getAvailableServices().map((service) => ({
    id: service.id,
    name: service.name,
    description: service.description,
    priceGTQ: service.priceGTQ,
    processingDays: service.processingDays,
  } as const));

  return Response.json(services);
}
