import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/solana';

const RAYDIUM_API = 'https://api-v3.raydium.io';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token')?.toUpperCase();
    const minTvl = parseFloat(searchParams.get('minTvl') || '0');
    const minApy = parseFloat(searchParams.get('minApy') || '0');
    const poolType = searchParams.get('type') || 'all'; // all, standard, concentrated
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = Math.min(parseInt(searchParams.get('pageSize') || '20'), 100);

    // Fetch pools from Raydium API v3
    const poolsRes = await fetchWithTimeout(
      `${RAYDIUM_API}/pools/info/list?poolType=${poolType}&poolSortField=default&sortType=desc&pageSize=${pageSize}&page=${page}`,
      {},
      15000
    );

    if (!poolsRes.ok) {
      // Try alternative endpoint for all pools
      const altRes = await fetchWithTimeout(
        `${RAYDIUM_API}/main/pairs`,
        {},
        15000
      );
      
      if (!altRes.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch Raydium pools' },
          { status: 500 }
        );
      }
      
      const altData = await altRes.json();
      return formatPoolsResponse(altData.data || altData, token, minTvl, minApy);
    }

    const poolsData = await poolsRes.json();
    return formatPoolsResponse(poolsData.data?.data || poolsData.data || [], token, minTvl, minApy);
  } catch (error: any) {
    console.error('Raydium pools error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Raydium API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pools' },
      { status: 500 }
    );
  }
}

function formatPoolsResponse(pools: any[], token?: string, minTvl?: number, minApy?: number) {
  let formatted = pools.map((p: any) => ({
    // Pool identification
    id: p.id || p.ammId || p.poolId,
    type: p.type || p.poolType || 'standard',
    
    // Token info
    mintA: p.mintA?.address || p.baseMint,
    mintB: p.mintB?.address || p.quoteMint,
    tokenA: {
      symbol: p.mintA?.symbol || p.baseSymbol,
      name: p.mintA?.name,
      decimals: p.mintA?.decimals,
      address: p.mintA?.address || p.baseMint,
      logoURI: p.mintA?.logoURI,
    },
    tokenB: {
      symbol: p.mintB?.symbol || p.quoteSymbol,
      name: p.mintB?.name,
      decimals: p.mintB?.decimals,
      address: p.mintB?.address || p.quoteMint,
      logoURI: p.mintB?.logoURI,
    },
    
    // Pricing
    price: p.price,
    
    // Liquidity & Volume
    tvl: p.tvl || p.liquidity,
    volume24h: p.day?.volume || p.volume24h,
    volume7d: p.week?.volume || p.volume7d,
    volumeQuote: p.day?.volumeQuote,
    
    // APY/APR
    apr24h: p.day?.apr || p.apr24h,
    apr7d: p.week?.apr || p.apr7d,
    apr30d: p.month?.apr || p.apr30d,
    feeApr24h: p.day?.feeApr || p.feeApr,
    rewardApr: p.day?.rewardApr,
    
    // Fees
    feeRate: p.feeRate || p.tradeFeeRate,
    lpFeeRate: p.lpFeeRate,
    protocolFeeRate: p.protocolFeeRate,
    
    // LP Token
    lpMint: p.lpMint?.address || p.lpMint,
    lpPrice: p.lpPrice,
    lpAmount: p.lpAmount,
    
    // Farm/Rewards info
    farmCount: p.farmCount,
    farmOngoingCount: p.farmOngoingCount,
    farmUpcomingCount: p.farmUpcomingCount,
    
    // Timestamps
    openTime: p.openTime,
    burnPercent: p.burnPercent,
  }));

  // Filter by token
  if (token) {
    formatted = formatted.filter((p: any) =>
      p.tokenA?.symbol?.toUpperCase() === token ||
      p.tokenB?.symbol?.toUpperCase() === token ||
      p.mintA?.toUpperCase() === token ||
      p.mintB?.toUpperCase() === token
    );
  }

  // Filter by minimum TVL
  if (minTvl && minTvl > 0) {
    formatted = formatted.filter((p: any) => (p.tvl || 0) >= minTvl);
  }

  // Filter by minimum APY (using 24h APR as proxy)
  if (minApy && minApy > 0) {
    formatted = formatted.filter((p: any) => (p.apr24h || 0) >= minApy);
  }

  // Sort by TVL descending
  formatted.sort((a: any, b: any) => (b.tvl || 0) - (a.tvl || 0));

  return NextResponse.json({
    success: true,
    pools: formatted,
    count: formatted.length,
    filters: { token, minTvl, minApy },
    source: 'raydium-v3',
  });
}
