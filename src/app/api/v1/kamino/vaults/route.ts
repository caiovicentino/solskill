import { NextRequest, NextResponse } from 'next/server';

const KAMINO_API = 'https://api.kamino.finance';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token')?.toUpperCase();
    const minApy = parseFloat(searchParams.get('minApy') || '0');

    // Fetch all vaults (earn strategies)
    const vaultsRes = await fetch(`${KAMINO_API}/strategies?status=LIVE`);
    
    if (!vaultsRes.ok) {
      // Try alternative endpoint
      const altRes = await fetch(`${KAMINO_API}/vault`);
      if (!altRes.ok) {
        return NextResponse.json(
          { success: false, error: 'Failed to fetch Kamino vaults' },
          { status: 500 }
        );
      }
      const vaults = await altRes.json();
      return formatVaultsResponse(vaults, token, minApy);
    }

    const vaults = await vaultsRes.json();
    return formatVaultsResponse(vaults, token, minApy);
  } catch (error) {
    console.error('Kamino vaults error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get vaults' },
      { status: 500 }
    );
  }
}

function formatVaultsResponse(vaults: any[], token?: string, minApy?: number) {
  let formatted = vaults.map((v: any) => ({
    address: v.address || v.strategyPubkey,
    name: v.name || v.strategyName,
    tokenA: v.tokenASymbol || v.tokenA?.symbol,
    tokenB: v.tokenBSymbol || v.tokenB?.symbol,
    protocol: v.protocol || v.strategyType,
    // APY info
    apy: v.apy || v.totalApy,
    apr: v.apr || v.totalApr,
    fees7d: v.fees7dApy,
    rewards7d: v.rewards7dApy,
    // TVL
    tvl: v.tvl || v.totalValueLocked,
    tvlUsd: v.tvlUsd,
    // Pool info
    poolAddress: v.pool || v.poolPubkey,
    dex: v.dex || v.ammLabel,
    // Risk
    riskLevel: v.riskLevel,
  }));

  // Filter by token
  if (token) {
    formatted = formatted.filter(
      (v: any) =>
        v.tokenA?.toUpperCase() === token ||
        v.tokenB?.toUpperCase() === token ||
        v.name?.toUpperCase().includes(token)
    );
  }

  // Filter by minimum APY
  if (minApy && minApy > 0) {
    formatted = formatted.filter((v: any) => (v.apy || 0) >= minApy);
  }

  // Sort by APY descending
  formatted.sort((a: any, b: any) => (b.apy || 0) - (a.apy || 0));

  return NextResponse.json({
    success: true,
    vaults: formatted,
    count: formatted.length,
    filters: { token, minApy },
  });
}
