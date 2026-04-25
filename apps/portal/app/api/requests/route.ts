import { getServicePrice } from '@/lib/catalog/services';
import { AppError } from '@/lib/errors';

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      serviceId?: string;
      clientSubmittedPrice?: number;
    };
    const { serviceId, clientSubmittedPrice } = body;

    if (!serviceId || typeof serviceId !== 'string') {
      throw new AppError(
        'PROFILE_VALIDATION',
        400,
        'serviceId is required'
      );
    }

    const serverPrice = getServicePrice(serviceId as any);

    if (serverPrice === null) {
      throw new AppError(
        'PROFILE_VALIDATION',
        404,
        'Service not available'
      );
    }

    return Response.json({
      requestId: 'placeholder',
      serviceId,
      serverPrice,
      clientSubmittedPrice,
      priceUsed: serverPrice,
    });
  } catch (error) {
    if (error instanceof AppError) {
      return Response.json(
        { code: error.code, message: error.message },
        { status: error.statusCode }
      );
    }
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
