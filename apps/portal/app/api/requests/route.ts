import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServicePrice, getServiceById } from '@/lib/catalog/services';
import { AppError } from '@/lib/errors';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const limit = 10;
    const offset = (page - 1) * limit;

    const { data, error, count } = await supabaseAdmin
      .from('service_requests')
      .select('id,service_id,status,price_gtq,created_at,updated_at', { count: 'exact' })
      .eq('user_id', session.userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return Response.json(
        { error: 'Failed to fetch requests' },
        { status: 500 }
      );
    }

    const requests = (data || []).map((req) => ({
      id: req.id,
      serviceId: req.service_id,
      serviceName: getServiceById(req.service_id as any)?.name || 'Unknown Service',
      status: req.status,
      priceGtq: req.price_gtq,
      createdAt: req.created_at,
      updatedAt: req.updated_at,
    }));

    return Response.json({
      requests,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit),
      },
    });
  } catch (error) {
    console.error('GET /api/requests error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
