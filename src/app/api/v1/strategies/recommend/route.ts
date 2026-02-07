import { NextRequest, NextResponse } from 'next/server';

const DEFILLAMA_API = 'https://yields.llama.fi/pools';

interface StrategyAllocation {
  protocol: string;
  action: string;
  allocation: number; // percentage
  estimatedApy: number;
  riskLevel: 'low' | 'medium' | 'high';
  rationale: string;
  endpoint: string;
}

// Fetch real APY data from DefiLlama for Kamino
async function fetchKaminoApys(): Promise<Record<string, number>> {
  try {
    const res = await fetch(DEFILLAMA_API, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });
    if (!res.ok) return {};
    const data = await res.json();
    const kamino = data.data.filter((p: any) => p.project === 'kamino-lend');
    const apys: Record<string, number> = {};
    for (const pool of kamino) {
      const symbol = pool.symbol?.toUpperCase();
      if (symbol) apys[symbol] = pool.apy || 0;
    }
    return apys;
  } catch {
    return {};
  }
}

// Fetch Raydium pool APYs
async function fetchRaydiumApys(): Promise<{ bestApy: number; poolName: string }> {
  try {
    const res = await fetch('https://api-v3.raydium.io/pools/info/list?poolType=all&poolSortField=default&sortType=desc&pageSize=10&page=1', {
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return { bestApy: 12.5, poolName: 'SOL-USDC' };
    const data = await res.json();
    const pools = data.data?.data || [];
    if (pools.length > 0) {
      const best = pools[0];
      return {
        bestApy: best.day?.apr || 12.5,
        poolName: `${best.mintA?.symbol || 'SOL'}-${best.mintB?.symbol || 'USDC'}`,
      };
    }
    return { bestApy: 12.5, poolName: 'SOL-USDC' };
  } catch {
    return { bestApy: 12.5, poolName: 'SOL-USDC' };
  }
}

function buildStrategy(
  goal: string,
  risk: string,
  token: string,
  amount: number,
  kaminoApys: Record<string, number>,
  raydiumData: { bestApy: number; poolName: string },
): { allocations: StrategyAllocation[]; totalEstimatedApy: number; riskScore: number } {
  const lendingApy = kaminoApys[token] || kaminoApys['USDC'] || 5.0;
  const vaultApy = lendingApy * 1.8; // Vaults typically yield more
  const lpApy = raydiumData.bestApy;

  let allocations: StrategyAllocation[] = [];

  if (risk === 'low' || goal === 'preserve capital') {
    allocations = [
      {
        protocol: 'Kamino Lending',
        action: 'supply',
        allocation: 60,
        estimatedApy: lendingApy,
        riskLevel: 'low',
        rationale: 'Overcollateralized lending provides stable yield with minimal risk',
        endpoint: 'POST /api/v1/kamino/deposit',
      },
      {
        protocol: 'Kamino Vaults',
        action: 'deposit',
        allocation: 30,
        estimatedApy: vaultApy,
        riskLevel: 'low',
        rationale: 'Automated vault strategies with built-in risk management',
        endpoint: 'POST /api/v1/kamino/deposit',
      },
      {
        protocol: 'Wallet (Reserve)',
        action: 'hold',
        allocation: 10,
        estimatedApy: 0,
        riskLevel: 'low',
        rationale: 'Liquid reserve for gas fees and opportunities',
        endpoint: 'GET /api/v1/wallet/balance',
      },
    ];
  } else if (risk === 'high' || goal === 'maximize yield') {
    allocations = [
      {
        protocol: 'Raydium LP',
        action: 'add-liquidity',
        allocation: 40,
        estimatedApy: lpApy,
        riskLevel: 'high',
        rationale: `High-yield LP in ${raydiumData.poolName} pool with trading fee income`,
        endpoint: 'POST /api/v1/raydium/pools/add-liquidity',
      },
      {
        protocol: 'Kamino Vaults',
        action: 'deposit',
        allocation: 35,
        estimatedApy: vaultApy,
        riskLevel: 'medium',
        rationale: 'Automated concentrated liquidity strategies for enhanced yields',
        endpoint: 'POST /api/v1/kamino/deposit',
      },
      {
        protocol: 'Kamino Lending',
        action: 'supply',
        allocation: 25,
        estimatedApy: lendingApy,
        riskLevel: 'low',
        rationale: 'Stable base yield to balance portfolio risk',
        endpoint: 'POST /api/v1/kamino/deposit',
      },
    ];
  } else {
    // Medium risk (default)
    allocations = [
      {
        protocol: 'Kamino Vaults',
        action: 'deposit',
        allocation: 40,
        estimatedApy: vaultApy,
        riskLevel: 'medium',
        rationale: 'Balanced yield through automated vault strategies',
        endpoint: 'POST /api/v1/kamino/deposit',
      },
      {
        protocol: 'Raydium LP',
        action: 'add-liquidity',
        allocation: 30,
        estimatedApy: lpApy,
        riskLevel: 'high',
        rationale: `Liquidity provision in ${raydiumData.poolName} for trading fee income`,
        endpoint: 'POST /api/v1/raydium/pools/add-liquidity',
      },
      {
        protocol: 'Kamino Lending',
        action: 'supply',
        allocation: 30,
        estimatedApy: lendingApy,
        riskLevel: 'low',
        rationale: 'Stable lending yield as portfolio anchor',
        endpoint: 'POST /api/v1/kamino/deposit',
      },
    ];
  }

  // Calculate weighted APY
  const totalEstimatedApy = allocations.reduce(
    (sum, a) => sum + (a.estimatedApy * a.allocation) / 100,
    0,
  );

  // Risk score: 0=safe, 100=risky
  const riskWeights = { low: 15, medium: 45, high: 75 };
  const riskScore = Math.round(
    allocations.reduce(
      (sum, a) => sum + (riskWeights[a.riskLevel] * a.allocation) / 100,
      0,
    ),
  );

  return { allocations, totalEstimatedApy: parseFloat(totalEstimatedApy.toFixed(2)), riskScore };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      goal = 'maximize yield',
      risk = 'medium',
      amount = 1000,
      token = 'USDC',
    } = body;

    // Validate inputs
    const validRisks = ['low', 'medium', 'high'];
    if (!validRisks.includes(risk.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'risk must be: low, medium, or high' },
        { status: 400 },
      );
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'amount must be positive' },
        { status: 400 },
      );
    }

    // Fetch real APY data in parallel
    const [kaminoApys, raydiumData] = await Promise.all([
      fetchKaminoApys(),
      fetchRaydiumApys(),
    ]);

    const strategy = buildStrategy(
      goal.toLowerCase(),
      risk.toLowerCase(),
      token.toUpperCase(),
      amount,
      kaminoApys,
      raydiumData,
    );

    return NextResponse.json({
      success: true,
      strategy: {
        goal,
        risk: risk.toLowerCase(),
        token: token.toUpperCase(),
        amount,
        totalEstimatedApy: strategy.totalEstimatedApy,
        riskScore: strategy.riskScore,
        allocations: strategy.allocations.map((a) => ({
          ...a,
          amountUsd: parseFloat(((amount * a.allocation) / 100).toFixed(2)),
        })),
      },
      dataSources: {
        kamino: Object.keys(kaminoApys).length > 0 ? 'live' : 'estimated',
        raydium: raydiumData.bestApy !== 12.5 ? 'live' : 'estimated',
      },
      disclaimer:
        'This is an algorithmic recommendation. Past performance does not guarantee future results. Always DYOR.',
    });
  } catch (error: any) {
    console.error('Strategy recommend error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate strategy: ' + error.message },
      { status: 500 },
    );
  }
}
