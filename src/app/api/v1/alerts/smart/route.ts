import { NextRequest, NextResponse } from 'next/server';

// Global in-memory store for smart alerts (shared with [id] route)
const getGlobalStore = (): Map<string, any[]> => {
  const g = globalThis as any;
  if (!g.__smartAlertsStore) {
    g.__smartAlertsStore = new Map<string, any[]>();
  }
  return g.__smartAlertsStore;
};

function getAlerts(key: string): any[] {
  return getGlobalStore().get(key) || [];
}

// POST /api/v1/alerts/smart - Create intelligent alert
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || 'anonymous';
    const body = await request.json();
    const { type, condition, webhook, name } = body;

    // Validate alert type
    const validTypes = ['price', 'yield', 'tvl', 'gas', 'health'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json({
        success: false,
        error: `type must be one of: ${validTypes.join(', ')}`,
      }, { status: 400 });
    }

    // Validate condition
    if (!condition || typeof condition !== 'object') {
      return NextResponse.json({
        success: false,
        error: 'condition is required. Example: {"token":"SOL","operator":"above","value":200}',
      }, { status: 400 });
    }

    const validOperators = ['above', 'below', 'change_pct', 'crosses'];
    if (!condition.operator || !validOperators.includes(condition.operator)) {
      return NextResponse.json({
        success: false,
        error: `condition.operator must be: ${validOperators.join(', ')}`,
      }, { status: 400 });
    }

    if (condition.value === undefined || condition.value === null) {
      return NextResponse.json({
        success: false,
        error: 'condition.value is required',
      }, { status: 400 });
    }

    const alert = {
      id: `smart_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      type,
      name: name || `${type} alert: ${condition.token || ''} ${condition.operator} ${condition.value}`,
      condition: {
        token: condition.token || null,
        protocol: condition.protocol || null,
        operator: condition.operator,
        value: parseFloat(condition.value),
        timeframe: condition.timeframe || null,
      },
      webhook: webhook || null,
      status: 'active',
      createdAt: new Date().toISOString(),
      triggeredAt: null,
      triggerCount: 0,
      lastChecked: null,
    };

    const alerts = getAlerts(apiKey);
    alerts.push(alert);
    getGlobalStore().set(apiKey, alerts);

    return NextResponse.json({
      success: true,
      message: 'Smart alert created',
      alert,
      endpoints: {
        list: 'GET /api/v1/alerts/smart',
        delete: `DELETE /api/v1/alerts/smart/${alert.id}`,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create smart alert',
    }, { status: 500 });
  }
}

// GET /api/v1/alerts/smart - List all smart alerts
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || 'anonymous';
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let alerts = getAlerts(apiKey);

    if (type) {
      alerts = alerts.filter(a => a.type === type);
    }
    if (status) {
      alerts = alerts.filter(a => a.status === status);
    }

    return NextResponse.json({
      success: true,
      alerts,
      total: alerts.length,
      stats: {
        active: alerts.filter(a => a.status === 'active').length,
        triggered: alerts.filter(a => a.status === 'triggered').length,
        byType: {
          price: alerts.filter(a => a.type === 'price').length,
          yield: alerts.filter(a => a.type === 'yield').length,
          tvl: alerts.filter(a => a.type === 'tvl').length,
          gas: alerts.filter(a => a.type === 'gas').length,
          health: alerts.filter(a => a.type === 'health').length,
        },
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch smart alerts',
    }, { status: 500 });
  }
}

// DELETE /api/v1/alerts/smart - Delete all smart alerts
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key') || 'anonymous';
    const alerts = getAlerts(apiKey);
    const count = alerts.length;
    getGlobalStore().set(apiKey, []);

    return NextResponse.json({
      success: true,
      message: `Deleted ${count} smart alerts`,
      deletedCount: count,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete smart alerts',
    }, { status: 500 });
  }
}
