import { NextRequest, NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://yields.llama.fi/pools';

interface RiskBreakdown {
  category: string;
  score: number; // 0-100
  weight: number; // percentage weight
  detail: string;
}

// Protocol maturity data (based on real protocol ages and audit status)
const PROTOCOL_DATA: Record<string, {
  launchYear: number;
  audits: number;
  auditFirms: string[];
  tvlTier: 'high' | 'medium' | 'low';
  incidents: number;
}> = {
  kamino: {
    launchYear: 2022,
    audits: 3,
    auditFirms: ['OtterSec', 'Neodyme', 'Offside Labs'],
    tvlTier: 'high',
    incidents: 0,
  },
  raydium: {
    launchYear: 2021,
    audits: 2,
    auditFirms: ['MadShield', 'SlowMist'],
    tvlTier: 'high',
    incidents: 1, // Dec 2022 exploit
  },
  jupiter: {
    launchYear: 2021,
    audits: 4,
    auditFirms: ['OtterSec', 'Neodyme', 'Trail of Bits', 'Offside Labs'],
    tvlTier: 'high',
    incidents: 0,
  },
};

function calculateSmartContractRisk(protocol: string): RiskBreakdown {
  const data = PROTOCOL_DATA[protocol.toLowerCase()];
  if (!data) {
    return { category: 'Smart Contract', score: 50, weight: 25, detail: 'Unknown protocol - moderate risk assumed' };
  }

  let score = 30; // Base risk
  const age = 2026 - data.launchYear;
  if (age >= 3) score -= 10; // Battle-tested
  if (data.audits >= 3) score -= 10;
  if (data.incidents > 0) score += 15;
  if (data.tvlTier === 'high') score -= 5; // More eyes on code

  return {
    category: 'Smart Contract',
    score: Math.max(5, Math.min(score, 80)),
    weight: 25,
    detail: `${data.audits} audits by ${data.auditFirms.join(', ')}. ${age}yr track record. ${data.incidents} incidents.`,
  };
}

function calculateImpermanentLossRisk(action: string, token: string): RiskBreakdown {
  if (action !== 'lp' && action !== 'add-liquidity') {
    return { category: 'Impermanent Loss', score: 0, weight: 0, detail: 'N/A - not a liquidity position' };
  }

  const stableTokens = ['USDC', 'USDT', 'PYUSD', 'USDY'];
  const correlatedTokens = ['SOL', 'MSOL', 'JITOSOL', 'BSOL', 'JUPSOL'];
  const tokenUpper = token.toUpperCase();

  if (stableTokens.includes(tokenUpper)) {
    return { category: 'Impermanent Loss', score: 10, weight: 30, detail: 'Stable pair - minimal IL risk' };
  }
  if (correlatedTokens.includes(tokenUpper)) {
    return { category: 'Impermanent Loss', score: 25, weight: 30, detail: 'SOL-correlated pair - low-medium IL risk' };
  }
  return { category: 'Impermanent Loss', score: 60, weight: 30, detail: 'Volatile pair - significant IL risk expected' };
}

function calculateLiquidationRisk(action: string, token: string, amount: number): RiskBreakdown {
  if (action !== 'borrow' && action !== 'deposit') {
    return { category: 'Liquidation', score: 0, weight: 0, detail: 'N/A - not a lending/borrowing position' };
  }

  if (action === 'deposit') {
    return { category: 'Liquidation', score: 5, weight: 20, detail: 'Supply-side only - no liquidation risk unless used as collateral for borrowing' };
  }

  // Borrowing - risk depends on collateral ratio
  const volatileTokens = ['SOL', 'ETH', 'WBTC', 'JUP', 'BONK'];
  const isVolatile = volatileTokens.includes(token.toUpperCase());

  return {
    category: 'Liquidation',
    score: isVolatile ? 55 : 25,
    weight: 20,
    detail: isVolatile
      ? 'Volatile collateral - monitor LTV closely. Liquidation at ~80% LTV.'
      : 'Stable collateral - lower liquidation risk. Liquidation at ~90% LTV.',
  };
}

function calculateProtocolTvlRisk(protocol: string, tvlUsd?: number): RiskBreakdown {
  const data = PROTOCOL_DATA[protocol.toLowerCase()];
  let score = 30;

  if (data?.tvlTier === 'high' || (tvlUsd && tvlUsd > 100_000_000)) {
    score = 10;
  } else if (data?.tvlTier === 'medium' || (tvlUsd && tvlUsd > 10_000_000)) {
    score = 25;
  } else {
    score = 50;
  }

  return {
    category: 'Protocol TVL & Maturity',
    score,
    weight: 15,
    detail: tvlUsd
      ? `TVL: $${(tvlUsd / 1_000_000).toFixed(1)}M. ${data ? 'Established protocol.' : 'Protocol maturity unknown.'}`
      : `${data?.tvlTier || 'unknown'} TVL tier. ${data ? `Launched ${data.launchYear}.` : ''}`,
  };
}

function calculateHistoricalRisk(protocol: string): RiskBreakdown {
  const data = PROTOCOL_DATA[protocol.toLowerCase()];
  if (!data) {
    return { category: 'Historical Performance', score: 40, weight: 10, detail: 'Insufficient data for historical analysis' };
  }

  let score = 20;
  if (data.incidents > 0) score += 20;
  if (2026 - data.launchYear >= 3) score -= 5;

  return {
    category: 'Historical Performance',
    score: Math.max(5, Math.min(score, 70)),
    weight: 10,
    detail: data.incidents > 0
      ? `${data.incidents} past security incident(s). Protocol has since been audited and patched.`
      : `No security incidents. ${2026 - data.launchYear}+ years of operation.`,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const protocol = searchParams.get('protocol') || 'kamino';
    const action = searchParams.get('action') || 'deposit';
    const token = searchParams.get('token') || 'SOL';
    const amount = parseFloat(searchParams.get('amount') || '100');

    // Validate inputs
    const validProtocols = ['kamino', 'raydium', 'jupiter'];
    if (!validProtocols.includes(protocol.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid protocol. Supported: ${validProtocols.join(', ')}` },
        { status: 400 },
      );
    }

    const validActions = ['deposit', 'withdraw', 'borrow', 'repay', 'swap', 'lp', 'add-liquidity'];
    if (!validActions.includes(action.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: `Invalid action. Supported: ${validActions.join(', ')}` },
        { status: 400 },
      );
    }

    // Fetch TVL from DefiLlama
    let tvlUsd: number | undefined;
    try {
      const res = await fetch(DEFILLAMA_API, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
      });
      if (res.ok) {
        const data = await res.json();
        const projectKey = protocol === 'kamino' ? 'kamino-lend' : protocol;
        const pools = data.data.filter((p: any) => p.project === projectKey);
        tvlUsd = pools.reduce((sum: number, p: any) => sum + (p.tvlUsd || 0), 0);
      }
    } catch { /* use without TVL data */ }

    // Calculate risk components
    const breakdown: RiskBreakdown[] = [
      calculateSmartContractRisk(protocol),
      calculateImpermanentLossRisk(action, token),
      calculateLiquidationRisk(action, token, amount),
      calculateProtocolTvlRisk(protocol, tvlUsd),
      calculateHistoricalRisk(protocol),
    ].filter(r => r.weight > 0);

    // Normalize weights to 100%
    const totalWeight = breakdown.reduce((sum, r) => sum + r.weight, 0);
    const normalizedBreakdown = breakdown.map(r => ({
      ...r,
      weight: Math.round((r.weight / totalWeight) * 100),
    }));

    // Calculate weighted overall score
    const overallScore = Math.round(
      normalizedBreakdown.reduce((sum, r) => sum + (r.score * r.weight) / 100, 0),
    );

    // Risk level classification
    let riskLevel: string;
    let riskColor: string;
    if (overallScore <= 20) { riskLevel = 'LOW'; riskColor = '#14F195'; }
    else if (overallScore <= 40) { riskLevel = 'MODERATE'; riskColor = '#FFD700'; }
    else if (overallScore <= 60) { riskLevel = 'ELEVATED'; riskColor = '#FF8C00'; }
    else if (overallScore <= 80) { riskLevel = 'HIGH'; riskColor = '#FF4444'; }
    else { riskLevel = 'CRITICAL'; riskColor = '#CC0000'; }

    return NextResponse.json({
      success: true,
      risk: {
        overallScore,
        riskLevel,
        riskColor,
        protocol: protocol.toLowerCase(),
        action: action.toLowerCase(),
        token: token.toUpperCase(),
        amount,
        breakdown: normalizedBreakdown,
        recommendation: overallScore > 60
          ? 'High risk detected. Consider reducing position size or choosing a lower-risk strategy.'
          : overallScore > 40
            ? 'Moderate risk. Ensure you understand the risks before proceeding.'
            : 'Acceptable risk level for most portfolios.',
      },
      tvlUsd: tvlUsd ? Math.round(tvlUsd) : undefined,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Risk score error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to calculate risk: ' + error.message },
      { status: 500 },
    );
  }
}
