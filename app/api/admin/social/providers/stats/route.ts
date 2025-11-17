import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { createServiceClient } from '@/lib/supabase';

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const sb = createServiceClient();
  
  const { data: userData } = await sb
    .from('users')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_admin) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  }

  try {
    // จำนวน Providers
    const { count: totalProviders } = await sb
      .from('social_providers')
      .select('*', { count: 'exact', head: true });

    const { count: activeProviders } = await sb
      .from('social_providers')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // จำนวน Services
    const { count: totalServices } = await sb
      .from('social_services')
      .select('*', { count: 'exact', head: true });

    const { count: publishedServices } = await sb
      .from('social_services')
      .select('*', { count: 'exact', head: true })
      .eq('is_published', true);

    // จำนวน Orders
    const { count: totalOrders } = await sb
      .from('social_orders')
      .select('*', { count: 'exact', head: true });

    // ยอดรวมราคา Orders
    const { data: ordersData } = await sb
      .from('social_orders')
      .select('price');

    const totalRevenue = ordersData?.reduce((sum, order) => sum + (Number(order.price) || 0), 0) || 0;

    // จำนวน Orders แยกตาม Status
    const { data: ordersByStatus } = await sb
      .from('social_orders')
      .select('status');

    const statusCounts = {
      processing: 0,
      completed: 0,
      cancelled: 0,
      partial: 0,
      other: 0
    };

    ordersByStatus?.forEach((order) => {
      const status = order.status?.toLowerCase();
      if (status === 'processing') statusCounts.processing++;
      else if (status === 'completed') statusCounts.completed++;
      else if (status === 'cancelled') statusCounts.cancelled++;
      else if (status === 'partial') statusCounts.partial++;
      else statusCounts.other++;
    });

    // จำนวน Services แยกตาม Provider
    const { data: servicesByProvider } = await sb
      .from('social_services')
      .select('provider_id, is_published');

    const providerStats: Record<number, { total: number; published: number }> = {};
    servicesByProvider?.forEach((service) => {
      const providerId = service.provider_id;
      if (providerId) {
        if (!providerStats[providerId]) {
          providerStats[providerId] = { total: 0, published: 0 };
        }
        providerStats[providerId].total++;
        if (service.is_published) {
          providerStats[providerId].published++;
        }
      }
    });

    return NextResponse.json({
      ok: true,
      data: {
        providers: {
          total: totalProviders || 0,
          active: activeProviders || 0,
          inactive: (totalProviders || 0) - (activeProviders || 0)
        },
        services: {
          total: totalServices || 0,
          published: publishedServices || 0,
          unpublished: (totalServices || 0) - (publishedServices || 0)
        },
        orders: {
          total: totalOrders || 0,
          byStatus: statusCounts
        },
        revenue: {
          total: totalRevenue
        },
        providerStats
      }
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return NextResponse.json({ error: 'unexpected' }, { status: 500 });
  }
}

