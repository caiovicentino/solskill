import { NextRequest, NextResponse } from 'next/server';

const KAMINO_API = 'https://api.kamino.finance';

// Main market address (most used)
const MAIN_MARKET = '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const market = searchParams.get('market') || MAIN_MARKET;
    const token = searchParams.get('token')?.toUpperCase();

    // Fetch reserves for market
    const reservesRes = await fetch(`${KAMINO_API}/kamino-market/${market}/reserves`);
    
    if (!reservesRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch reserves' },
        { status: reservesRes.status }
      );
    }

    const reserves = await reservesRes.json();

    // Format reserves
    let formattedReserves = reserves.map((r: any) => ({
      address: r.address,
      mint: r.liquidity?.mintPubkey,
      symbol: r.symbol,
      decimals: r.liquidity?.mintDecimals,
      // Supply info
      supplyApy: r.supplyInterestAPY,
      totalSupply: r.liquidity?.totalSupply,
      availableLiquidity: r.liquidity?.availableAmount,
      // Borrow info
      borrowApy: r.borrowInterestAPY,
      totalBorrowed: r.liquidity?.totalBorrow,
      // Utilization
      utilizationRate: r.liquidity?.utilizationRate,
      // Collateral info
      loanToValue: r.config?.loanToValuePct,
      liquidationThreshold: r.config?.liquidationThreshold,
      // Price
      price: r.price,
    }));

    // Filter by token if specified
    if (token) {
      formattedReserves = formattedReserves.filter(
        (r: any) => r.symbol?.toUpperCase() === token
      );
    }

    return NextResponse.json({
      success: true,
      market,
      reserves: formattedReserves,
      count: formattedReserves.length,
    });
  } catch (error) {
    console.error('Kamino reserves error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get reserves' },
      { status: 500 }
    );
  }
}
