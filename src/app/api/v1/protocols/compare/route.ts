import { NextRequest, NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://yields.llama.fi/pools';

interface ProtocolComparison {
  name: string;
  protocol: string;
  apy: number;
  apyBase: number;
  apyReward: number;
  tvl: number;
  risk: 'low' | 'medium' | 'high';
  fees: string;
  pool: string;
  endpoint: string;
}

function assessRisk(project: string, apy: number, tvl: number): 'low' | 'medium' | 'high' {
  if (apy > 30 || tvl < 1_000_000) return 'high';
  if (apy > 15 || tvl < 10_000_000) return 'medium';
  return 'low';
}

function getProtocolFees(project: string): string {
  const feeMap: Record<string, string> = {
    'kamino-lend': '0% deposit, variable borrow rate',
    'kamino': '10% performance fee',
    'raydium': '0.25% swap fee, shared with LPs',
    'marginfi': '0% deposit, variable borrow rate',
    'solend': '0% deposit, variable borrow rate',
    'drift-protocol': '0.1% taker, 0% maker',
    'marinade-finance': '~6% staking commission',
    'jito': '~4% MEV commission',
    'orca': '0.3% swap fee',
  };
  return feeMap[project] || 'Variable';
}

function getEndpoint(project: string, action: string): string {
  if (action === 'lend' || action === 'deposit') {
    if (project.includes('kamino')) return 'POST /api/v1/kamino/deposit';
    return 'POST /api/v1/kamino/deposit';
  }
  if (action === 'swap') return 'POST /api/v1/jupiter/swap';
  if (action === 'lp' || action === 'liquidity') return 'POST /api/v1/raydium/pools/add-liquidity';
  return 'POST /api/v1/kamino/deposit';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action')?.toLowerCase() || 'lend';
    const token = searchParams.get('token')?.toUpperCase() || 'USDC';
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 20);

    const res = await fetch(DEFILLAMA_API, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch protocol data from DefiLlama' },
        { status: 502 },
      );
    }

    const data = await res.json();

    // Filter pools based on action and token
    let pools = (data.data || []).filter((p: any) => {
      if (p.chain !== 'Solana') return false;
      if (!p.apy || p.apy <= 0) return false;
      if (p.tvlUsd < 100_000) return false;

      // Token filter
      const symbol = (p.symbol || '').toUpperCase();
      if (!symbol.includes(token)) return false;

      // Action filter
      if (action === 'lend' || action === 'deposit') {
        return p.project.includes('lend') || p.project === 'marginfi' || p.project === 'solend' || p.project === 'kamino-lend';
      }
      if (action === 'lp' || action === 'liquidity') {
        return p.project === 'raydium' || p.project === 'orca';
      }
      if (action === 'vault') {
        return p.project === 'kamino' || p.project === 'drift-protocol';
      }
      return true;
    });

    // Map and sort
    let protocols: ProtocolComparison[] = pools
      .map((p: any) => ({
        name: p.project.replace(/-/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()),
        protocol: p.project,
        apy: parseFloat((p.apy || 0).toFixed(2)),
        apyBase: parseFloat((p.apyBase || 0).toFixed(2)),
        apyReward: parseFloat((p.apyReward || 0).toFixed(2)),
        tvl: Math.round(p.tvlUsd || 0),
        risk: assessRisk(p.project, p.apy, p.tvlUsd),
        fees: getProtocolFees(p.project),
        pool: p.pool,
        endpoint: getEndpoint(p.project, action),
      }))
      .sort((a: ProtocolComparison, b: ProtocolComparison) => b.apy - a.apy)
      .slice(0, limit);

    // Generate recommendation
    let recommendation = '';
    if (protocols.length > 0) {
      const best = protocols[0];
      const safest = [...protocols].sort((a, b) => {
        const riskOrder = { low: 1, medium: 2, high: 3 };
        return riskOrder[a.risk] - riskOrder[b.risk] || b.apy - a.apy;
      })[0];

      if (best.protocol === safest.protocol) {
        recommendation = `${best.name} offers the best ${action} yield for ${token} at ${best.apy}% APY with ${best.risk} risk. TVL: $${(best.tvl / 1e6).toFixed(1)}M.`;
      } else {
        recommendation = `Best yield: ${best.name} at ${best.apy}% APY (${best.risk} risk). Safest option: ${safest.name} at ${safest.apy}% APY (${safest.risk} risk, $${(safest.tvl / 1e6).toFixed(1)}M TVL).`;
      }
    } else {
      recommendation = `No ${action} opportunities found for ${token} on Solana. Try a different action or token.`;
    }

    return NextResponse.json({
      success: true,
      comparison: {
        action,
        token,
        protocols,
        count: protocols.length,
        recommendation,
      },
      source: 'defillama',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Protocol comparison failed: ' + error.message },
      { status: 500 },
    );
  }
}
