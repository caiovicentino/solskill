import { NextRequest, NextResponse } from 'next/server';

const KAMINO_API = 'https://api.kamino.finance';

export async function GET(req: NextRequest) {
  try {
    // Fetch all lending markets
    const marketsRes = await fetch(`${KAMINO_API}/kamino-market`);
    
    if (!marketsRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch Kamino markets' },
        { status: marketsRes.status }
      );
    }

    const markets = await marketsRes.json();

    // Format response
    const formattedMarkets = markets.map((m: any) => ({
      address: m.lendingMarket,
      name: m.marketName || 'Main Market',
      tvl: m.tvl,
      totalBorrowed: m.totalBorrowed,
      totalSupplied: m.totalSupplied,
      reserves: m.reserves?.length || 0,
    }));

    return NextResponse.json({
      success: true,
      markets: formattedMarkets,
      count: formattedMarkets.length,
    });
  } catch (error) {
    console.error('Kamino markets error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get Kamino markets' },
      { status: 500 }
    );
  }
}
