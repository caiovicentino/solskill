import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for alerts (in production, use database)
const alerts: Map<string, any[]> = new Map();

// Helper to get alerts for an agent
function getAgentAlerts(apiKey: string): any[] {
  return alerts.get(apiKey) || [];
}

// GET /api/v1/alerts - List all price alerts for the authenticated agent
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status'); // active, triggered, all
    const agentAlerts = getAgentAlerts(apiKey);
    
    let filteredAlerts = agentAlerts;
    if (status && status !== 'all') {
      filteredAlerts = agentAlerts.filter(a => a.status === status);
    }

    return NextResponse.json({
      success: true,
      alerts: filteredAlerts,
      total: filteredAlerts.length,
      stats: {
        active: agentAlerts.filter(a => a.status === 'active').length,
        triggered: agentAlerts.filter(a => a.status === 'triggered').length,
        disabled: agentAlerts.filter(a => a.status === 'disabled').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch alerts',
    }, { status: 500 });
  }
}

// POST /api/v1/alerts - Create a new price alert
export async function POST(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const body = await request.json();
    const { 
      tokenMint,      // Token address to monitor
      tokenSymbol,    // Optional: Token symbol for display
      condition,      // 'above' | 'below' | 'change_percent'
      targetPrice,    // Target price in USD (for above/below)
      changePercent,  // Percentage change threshold (for change_percent)
      timeframe,      // Optional: Timeframe for change_percent ('1h', '24h', '7d')
      webhookUrl,     // Optional: URL to call when alert triggers
      repeat,         // Optional: If true, alert resets after triggering
    } = body;

    // Validation
    if (!tokenMint) {
      return NextResponse.json({
        success: false,
        error: 'tokenMint is required',
      }, { status: 400 });
    }

    if (!condition || !['above', 'below', 'change_percent'].includes(condition)) {
      return NextResponse.json({
        success: false,
        error: "condition must be 'above', 'below', or 'change_percent'",
      }, { status: 400 });
    }

    if (condition !== 'change_percent' && !targetPrice) {
      return NextResponse.json({
        success: false,
        error: 'targetPrice is required for above/below conditions',
      }, { status: 400 });
    }

    if (condition === 'change_percent' && !changePercent) {
      return NextResponse.json({
        success: false,
        error: 'changePercent is required for change_percent condition',
      }, { status: 400 });
    }

    // Create alert object
    const alert = {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      tokenMint,
      tokenSymbol: tokenSymbol || null,
      condition,
      targetPrice: targetPrice ? parseFloat(targetPrice) : null,
      changePercent: changePercent ? parseFloat(changePercent) : null,
      timeframe: timeframe || '24h',
      webhookUrl: webhookUrl || null,
      repeat: repeat || false,
      status: 'active',
      createdAt: new Date().toISOString(),
      triggeredAt: null,
      triggerCount: 0,
    };

    // Store alert
    const agentAlerts = getAgentAlerts(apiKey);
    agentAlerts.push(alert);
    alerts.set(apiKey, agentAlerts);

    return NextResponse.json({
      success: true,
      message: 'Price alert created successfully',
      alert,
      note: 'Alert will trigger when condition is met. Check status with GET /api/v1/alerts',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create alert',
    }, { status: 500 });
  }
}

// DELETE /api/v1/alerts - Delete all alerts
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const agentAlerts = getAgentAlerts(apiKey);
    const deletedCount = agentAlerts.length;
    
    alerts.set(apiKey, []);

    return NextResponse.json({
      success: true,
      message: `Deleted ${deletedCount} alerts`,
      deletedCount,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete alerts',
    }, { status: 500 });
  }
}
