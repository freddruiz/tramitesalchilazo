import { getSession } from '@/lib/auth/session';
import { requireStepUp } from '@/lib/auth/stepUp';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { SERVICE_CATALOG, getServiceById } from '@/lib/catalog/services';
import type { ServiceId } from '@/lib/catalog/services';
import { extractClientIp } from '@/lib/admin/ipAllowlist';
import { writeAuditEntry, AuditAction } from '@tramitesalchilazo/shared';

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
    const session = await requireStepUp()();

    const body = (await request.json()) as { serviceId?: string };
    const { serviceId } = body;

    if (!serviceId || typeof serviceId !== 'string') {
      return Response.json({ error: 'serviceId is required' }, { status: 400 });
    }

    const service = SERVICE_CATALOG[serviceId as ServiceId];
    if (!service || !service.available) {
      return Response.json({ error: 'Not found' }, { status: 404 });
    }

    // Idempotency: return existing request if same user + service is pending_payment or queued
    const { data: existing } = await supabaseAdmin
      .from('service_requests')
      .select('id, price_gtq')
      .eq('user_id', session.userId)
      .eq('service_id', serviceId)
      .in('status', ['pending_payment', 'queued'])
      .maybeSingle();

    if (existing) {
      return Response.json({
        requestId: existing.id,
        paymentAmount: existing.price_gtq,
      });
    }

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .insert({
        user_id: session.userId,
        service_id: serviceId,
        status: 'pending_payment',
        price_gtq: service.priceGTQ,
      })
      .select('id, price_gtq')
      .single();

    if (error || !data) {
      console.error('POST /api/requests insert error:', error);
      return Response.json({ error: 'Failed to create request' }, { status: 500 });
    }

    await writeAuditEntry(
      {
        actorId: session.userId,
        action: AuditAction.RequestCreate,
        resourceType: 'service_request',
        resourceId: data.id,
        ipRaw: extractClientIp(request.headers),
        metadata: { serviceId, priceGtq: data.price_gtq },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      supabaseAdmin as any,
    );

    return Response.json({
      requestId: data.id,
      paymentAmount: data.price_gtq,
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'code' in err) {
      const e = err as { code: string; statusCode: number; message?: string };
      return Response.json(
        { code: e.code, message: e.message ?? 'Error' },
        { status: e.statusCode }
      );
    }
    console.error('POST /api/requests error:', err);
    return Response.json(
      { code: 'INTERNAL_ERROR', message: 'Internal server error' },
      { status: 500 }
    );
  }
}
