import { NextRequest, NextResponse } from 'next/server';

// In-memory storage for orders (in production, use database)
const orders: Map<string, any[]> = new Map();

// Helper to get orders for an agent
function getAgentOrders(apiKey: string): any[] {
  return orders.get(apiKey) || [];
}

// GET /api/v1/orders - List all limit orders for the authenticated agent
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const status = request.nextUrl.searchParams.get('status'); // open, filled, cancelled, all
    const agentOrders = getAgentOrders(apiKey);
    
    let filteredOrders = agentOrders;
    if (status && status !== 'all') {
      filteredOrders = agentOrders.filter(o => o.status === status);
    }

    return NextResponse.json({
      success: true,
      orders: filteredOrders,
      total: filteredOrders.length,
      stats: {
        open: agentOrders.filter(o => o.status === 'open').length,
        filled: agentOrders.filter(o => o.status === 'filled').length,
        cancelled: agentOrders.filter(o => o.status === 'cancelled').length,
      },
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch orders',
    }, { status: 500 });
  }
}

// POST /api/v1/orders - Create a new limit order
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
      inputMint,      // Token to sell
      outputMint,     // Token to buy
      inAmount,       // Amount to sell (in smallest units)
      outAmount,      // Minimum amount to receive (in smallest units)
      expiry,         // Optional: Unix timestamp when order expires
    } = body;

    // Validation
    if (!inputMint || !outputMint) {
      return NextResponse.json({
        success: false,
        error: 'inputMint and outputMint are required',
      }, { status: 400 });
    }

    if (!inAmount || !outAmount) {
      return NextResponse.json({
        success: false,
        error: 'inAmount and outAmount are required',
      }, { status: 400 });
    }

    // Calculate limit price
    const limitPrice = parseFloat(outAmount) / parseFloat(inAmount);

    // Create order object
    const order = {
      id: `order_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      inputMint,
      outputMint,
      inAmount: inAmount.toString(),
      outAmount: outAmount.toString(),
      limitPrice,
      status: 'open',
      createdAt: new Date().toISOString(),
      expiry: expiry ? new Date(expiry * 1000).toISOString() : null,
      filledAt: null,
      txSignature: null,
    };

    // Store order
    const agentOrders = getAgentOrders(apiKey);
    agentOrders.push(order);
    orders.set(apiKey, agentOrders);

    return NextResponse.json({
      success: true,
      message: 'Limit order created successfully',
      order,
      note: 'Order will be executed when market price reaches your limit price. Monitor with GET /api/v1/orders',
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to create order',
    }, { status: 500 });
  }
}

// DELETE /api/v1/orders - Cancel all open orders
export async function DELETE(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const agentOrders = getAgentOrders(apiKey);
    let cancelledCount = 0;

    agentOrders.forEach(order => {
      if (order.status === 'open') {
        order.status = 'cancelled';
        order.cancelledAt = new Date().toISOString();
        cancelledCount++;
      }
    });

    orders.set(apiKey, agentOrders);

    return NextResponse.json({
      success: true,
      message: `Cancelled ${cancelledCount} open orders`,
      cancelledCount,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to cancel orders',
    }, { status: 500 });
  }
}
