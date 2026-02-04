import { NextRequest, NextResponse } from 'next/server';

// In-memory storage reference (shared with parent route)
const alerts: Map<string, any[]> = new Map();

function getAgentAlerts(apiKey: string): any[] {
  return alerts.get(apiKey) || [];
}

// GET /api/v1/alerts/[alertId] - Get specific alert details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const { alertId } = await params;
    const agentAlerts = getAgentAlerts(apiKey);
    const alert = agentAlerts.find(a => a.id === alertId);

    if (!alert) {
      return NextResponse.json({
        success: false,
        error: `Alert ${alertId} not found`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      alert,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch alert',
    }, { status: 500 });
  }
}

// PATCH /api/v1/alerts/[alertId] - Update alert (enable/disable, modify)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const { alertId } = await params;
    const body = await request.json();
    const agentAlerts = getAgentAlerts(apiKey);
    const alertIndex = agentAlerts.findIndex(a => a.id === alertId);

    if (alertIndex === -1) {
      return NextResponse.json({
        success: false,
        error: `Alert ${alertId} not found`,
      }, { status: 404 });
    }

    const alert = agentAlerts[alertIndex];

    // Update allowed fields
    if (body.status !== undefined) {
      if (!['active', 'disabled'].includes(body.status)) {
        return NextResponse.json({
          success: false,
          error: "status must be 'active' or 'disabled'",
        }, { status: 400 });
      }
      alert.status = body.status;
    }

    if (body.targetPrice !== undefined) {
      alert.targetPrice = parseFloat(body.targetPrice);
    }

    if (body.changePercent !== undefined) {
      alert.changePercent = parseFloat(body.changePercent);
    }

    if (body.webhookUrl !== undefined) {
      alert.webhookUrl = body.webhookUrl;
    }

    if (body.repeat !== undefined) {
      alert.repeat = body.repeat;
    }

    alert.updatedAt = new Date().toISOString();
    alerts.set(apiKey, agentAlerts);

    return NextResponse.json({
      success: true,
      message: 'Alert updated successfully',
      alert,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to update alert',
    }, { status: 500 });
  }
}

// DELETE /api/v1/alerts/[alertId] - Delete specific alert
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ alertId: string }> }
) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const { alertId } = await params;
    const agentAlerts = getAgentAlerts(apiKey);
    const alertIndex = agentAlerts.findIndex(a => a.id === alertId);

    if (alertIndex === -1) {
      return NextResponse.json({
        success: false,
        error: `Alert ${alertId} not found`,
      }, { status: 404 });
    }

    const deletedAlert = agentAlerts.splice(alertIndex, 1)[0];
    alerts.set(apiKey, agentAlerts);

    return NextResponse.json({
      success: true,
      message: 'Alert deleted successfully',
      deletedAlert,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to delete alert',
    }, { status: 500 });
  }
}
