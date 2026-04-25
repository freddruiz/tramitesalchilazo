import { getSession } from '@/lib/auth/session';
import { supabaseAdmin } from '@/lib/supabase/admin';
import { getServiceById } from '@/lib/catalog/services';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await context.params;

    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .select('id,user_id,service_id,status,price_gtq,metadata,created_at,updated_at')
      .eq('id', id)
      .single();

    if (error || !data) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    if (data.user_id !== session.userId) {
      return Response.json({ error: 'Request not found' }, { status: 404 });
    }

    return Response.json({
      id: data.id,
      serviceId: data.service_id,
      serviceName: getServiceById(data.service_id as any)?.name || 'Unknown Service',
      status: data.status,
      priceGtq: data.price_gtq,
      metadata: data.metadata,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    });
  } catch (error) {
    console.error('GET /api/requests/[id] error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
