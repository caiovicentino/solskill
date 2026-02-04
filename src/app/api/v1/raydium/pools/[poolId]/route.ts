import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout, isValidSolanaAddress } from '@/lib/solana';

const RAYDIUM_API = 'https://api-v3.raydium.io';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ poolId: string }> }
) {
  try {
    const { poolId } = await params;

    // Validate pool ID format
    if (!poolId || !isValidSolanaAddress(poolId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid pool ID format' },
        { status: 400 }
      );
    }

    // Fetch pool details from Raydium API v3
    const poolRes = await fetchWithTimeout(
      `${RAYDIUM_API}/pools/info/ids?ids=${poolId}`,
      {},
      15000
    );

    if (!poolRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pool details from Raydium' },
        { status: poolRes.status }
      );
    }

    const poolData = await poolRes.json();
    
    if (!poolData.success || !poolData.data || poolData.data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pool not found' },
        { status: 404 }
      );
    }

    const pool = poolData.data[0];

    // Format response
    const formatted = {
      // Pool identification
      id: pool.id || pool.ammId,
      type: pool.type || pool.poolType || 'standard',
      programId: pool.programId,
      
      // Token info
      mintA: {
        address: pool.mintA?.address || pool.baseMint,
        symbol: pool.mintA?.symbol || pool.baseSymbol,
        name: pool.mintA?.name,
        decimals: pool.mintA?.decimals,
        logoURI: pool.mintA?.logoURI,
      },
      mintB: {
        address: pool.mintB?.address || pool.quoteMint,
        symbol: pool.mintB?.symbol || pool.quoteSymbol,
        name: pool.mintB?.name,
        decimals: pool.mintB?.decimals,
        logoURI: pool.mintB?.logoURI,
      },
      
      // Current reserves
      mintAmountA: pool.mintAmountA,
      mintAmountB: pool.mintAmountB,
      
      // Pricing
      price: pool.price,
      
      // Liquidity & Volume
      tvl: pool.tvl || pool.liquidity,
      volume24h: pool.day?.volume,
      volume7d: pool.week?.volume,
      volume30d: pool.month?.volume,
      volumeFee24h: pool.day?.volumeFee,
      
      // APY/APR breakdown
      apr: {
        day: pool.day?.apr,
        week: pool.week?.apr,
        month: pool.month?.apr,
      },
      feeApr: {
        day: pool.day?.feeApr,
        week: pool.week?.feeApr,
        month: pool.month?.feeApr,
      },
      rewardApr: {
        day: pool.day?.rewardApr,
        week: pool.week?.rewardApr,
        month: pool.month?.rewardApr,
      },
      
      // Fee structure
      feeRate: pool.feeRate,
      lpFeeRate: pool.lpFeeRate,
      protocolFeeRate: pool.protocolFeeRate,
      
      // LP Token info
      lpMint: {
        address: pool.lpMint?.address || pool.lpMint,
        decimals: pool.lpMint?.decimals,
      },
      lpPrice: pool.lpPrice,
      lpAmount: pool.lpAmount,
      
      // Pool accounts (for on-chain operations)
      marketId: pool.marketId,
      authority: pool.authority,
      openOrders: pool.openOrders,
      targetOrders: pool.targetOrders,
      vault: {
        A: pool.vault?.A,
        B: pool.vault?.B,
      },
      
      // Farm info
      farmCount: pool.farmCount,
      farmOngoingCount: pool.farmOngoingCount,
      farmUpcomingCount: pool.farmUpcomingCount,
      
      // Config
      config: pool.config,
      
      // Timestamps
      openTime: pool.openTime,
      burnPercent: pool.burnPercent,
    };

    return NextResponse.json({
      success: true,
      pool: formatted,
      source: 'raydium-v3',
    });
  } catch (error: any) {
    console.error('Raydium pool details error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Raydium API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch pool details' },
      { status: 500 }
    );
  }
}
