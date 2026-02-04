import { NextRequest, NextResponse } from 'next/server';

// In-memory storage reference (shared with parent route)
// In production, this would be a database
const orders: Map<string, any[]> = new Map();

function getAgentOrders(apiKey: string): any[] {
  return orders.get(apiKey) || [];
}

// GET /api/v1/orders/[orderId] - Get specific order details
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const { orderId } = await params;
    const agentOrders = getAgentOrders(apiKey);
    const order = agentOrders.find(o => o.id === orderId);

    if (!order) {
      return NextResponse.json({
        success: false,
        error: `Order ${orderId} not found`,
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      order,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch order',
    }, { status: 500 });
  }
}

// DELETE /api/v1/orders/[orderId] - Cancel specific order
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const { orderId } = await params;
    const agentOrders = getAgentOrders(apiKey);
    const orderIndex = agentOrders.findIndex(o => o.id === orderId);

    if (orderIndex === -1) {
      return NextResponse.json({
        success: false,
        error: `Order ${orderId} not found`,
      }, { status: 404 });
    }

    const order = agentOrders[orderIndex];

    if (order.status !== 'open') {
      return NextResponse.json({
        success: false,
        error: `Cannot cancel order with status: ${order.status}`,
      }, { status: 400 });
    }

    order.status = 'cancelled';
    order.cancelledAt = new Date().toISOString();
    orders.set(apiKey, agentOrders);

    return NextResponse.json({
      success: true,
      message: 'Order cancelled successfully',
      order,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel order',
    }, { status: 500 });
  }
}
