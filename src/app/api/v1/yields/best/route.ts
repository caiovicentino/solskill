import { NextRequest, NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://yields.llama.fi/pools';

interface YieldOpportunity {
  protocol: string;
  type: 'lending' | 'vault' | 'lp';
  pool: string;
  token: string;
  apy: number;
  apyBase: number;
  apyReward: number;
  tvlUsd: number;
  riskLevel: 'low' | 'medium' | 'high';
  action: string;
  endpoint: string;
}

const SUPPORTED_PROJECTS = [
  'kamino-lend',
  'kamino',
  'raydium',
  'marinade-finance',
  'jito',
  'drift-protocol',
  'marginfi',
  'solend',
];

function classifyRisk(project: string, apy: number, tvl: number): 'low' | 'medium' | 'high' {
  // High APY with low TVL = high risk
  if (apy > 50 && tvl < 1_000_000) return 'high';
  if (apy > 30) return 'high';
  if (apy > 15 || tvl < 5_000_000) return 'medium';
  return 'low';
}

function getProtocolType(project: string): 'lending' | 'vault' | 'lp' {
  if (project.includes('lend') || project === 'marginfi' || project === 'solend') return 'lending';
  if (project === 'raydium' || project === 'orca') return 'lp';
  return 'vault';
}

function getEndpoint(type: 'lending' | 'vault' | 'lp'): string {
  switch (type) {
    case 'lending': return 'POST /api/v1/kamino/deposit';
    case 'vault': return 'POST /api/v1/kamino/deposit';
    case 'lp': return 'POST /api/v1/raydium/pools/add-liquidity';
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token')?.toUpperCase();
    const minApy = parseFloat(searchParams.get('minApy') || '0');
    const maxRisk = searchParams.get('maxRisk')?.toLowerCase(); // low, medium, high
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    // Fetch real yield data from DefiLlama
    const res = await fetch(DEFILLAMA_API, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch yield data from DefiLlama' },
        { status: 502 },
      );
    }

    const data = await res.json();

    // Filter for Solana pools from supported protocols
    let pools = data.data.filter(
      (p: any) =>
        p.chain === 'Solana' &&
        SUPPORTED_PROJECTS.includes(p.project) &&
        p.apy > 0 &&
        p.tvlUsd > 100_000, // Minimum TVL filter for quality
    );

    // Map to our format
    let yields: YieldOpportunity[] = pools.map((p: any) => {
      const type = getProtocolType(p.project);
      return {
        protocol: p.project,
        type,
        pool: p.pool,
        token: p.symbol?.toUpperCase() || 'UNKNOWN',
        apy: parseFloat((p.apy || 0).toFixed(2)),
        apyBase: parseFloat((p.apyBase || 0).toFixed(2)),
        apyReward: parseFloat((p.apyReward || 0).toFixed(2)),
        tvlUsd: Math.round(p.tvlUsd || 0),
        riskLevel: classifyRisk(p.project, p.apy, p.tvlUsd),
        action: type === 'lp' ? 'add-liquidity' : 'deposit',
        endpoint: getEndpoint(type),
      };
    });

    // Apply filters
    if (token) {
      yields = yields.filter(y =>
        y.token === token || y.token.includes(token),
      );
    }

    if (minApy > 0) {
      yields = yields.filter(y => y.apy >= minApy);
    }

    if (maxRisk) {
      const riskOrder = { low: 1, medium: 2, high: 3 };
      const maxRiskLevel = riskOrder[maxRisk as keyof typeof riskOrder] || 3;
      yields = yields.filter(y => riskOrder[y.riskLevel] <= maxRiskLevel);
    }

    // Sort by APY descending
    yields.sort((a, b) => b.apy - a.apy);

    // Limit results
    yields = yields.slice(0, limit);

    return NextResponse.json({
      success: true,
      yields,
      count: yields.length,
      filters: { token: token || 'all', minApy, maxRisk: maxRisk || 'all', limit },
      source: 'defillama',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Yield optimizer error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch yields: ' + error.message },
      { status: 500 },
    );
  }
}
