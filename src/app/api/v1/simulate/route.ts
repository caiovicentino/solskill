import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';

const JUPITER_API = 'https://api.jup.ag/ultra/v1';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || 'a6ae79cc-4699-4de4-8b93-826698f419d4';
const DEFILLAMA_API = 'https://yields.llama.fi/pools';

const TOKEN_MINTS: Record<string, string> = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
};

const TOKEN_DECIMALS: Record<string, number> = {
  'SOL': 9, 'USDC': 6, 'USDT': 6,
};

function resolveMint(input: string): string {
  return TOKEN_MINTS[input.toUpperCase()] || input;
}

function resolveDecimals(mint: string): number {
  for (const [sym, addr] of Object.entries(TOKEN_MINTS)) {
    if (addr === mint) return TOKEN_DECIMALS[sym] || 9;
  }
  return TOKEN_DECIMALS[mint.toUpperCase()] || 9;
}

async function simulateSwap(params: {
  inputMint: string;
  outputMint: string;
  amount: string;
  slippageBps?: number;
}) {
  const inputMint = resolveMint(params.inputMint);
  const outputMint = resolveMint(params.outputMint);
  const slippageBps = params.slippageBps || 50;

  // Get real quote from Jupiter
  const quoteUrl = `${JUPITER_API}/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${params.amount}&slippageBps=${slippageBps}`;

  const quoteRes = await fetchWithTimeout(quoteUrl, {
    headers: {
      'Accept': 'application/json',
      'x-api-key': JUPITER_API_KEY,
    },
  }, 10000);

  if (!quoteRes.ok) {
    const errText = await quoteRes.text();
    throw new Error(`Jupiter quote failed: ${errText}`);
  }

  const quote = await quoteRes.json();
  const inputDecimals = resolveDecimals(inputMint);
  const outputDecimals = resolveDecimals(outputMint);
  const inHuman = parseInt(params.amount) / Math.pow(10, inputDecimals);
  const outHuman = parseInt(quote.outAmount) / Math.pow(10, outputDecimals);

  // Estimate fees (Solana base fee + priority fee)
  const estimatedFeeSol = 0.000005 + 0.0001; // ~0.0001 SOL priority fee
  const estimatedFeeUsd = estimatedFeeSol * 170; // rough SOL price

  return {
    operation: 'swap',
    status: 'simulated',
    input: {
      mint: inputMint,
      amount: params.amount,
      humanAmount: inHuman,
    },
    expectedOutput: {
      mint: outputMint,
      amount: quote.outAmount,
      humanAmount: outHuman,
    },
    priceImpact: quote.priceImpactPct || '< 0.01%',
    slippageBps,
    route: quote.routePlan?.map((r: any) => ({
      label: r.swapInfo?.label,
      percent: r.percent,
    })) || [{ label: 'Jupiter Ultra', percent: 100 }],
    fees: {
      networkFeeSol: estimatedFeeSol,
      networkFeeUsd: parseFloat(estimatedFeeUsd.toFixed(4)),
      platformFee: 0,
    },
    riskAssessment: {
      priceImpactRisk: parseFloat(String(quote.priceImpactPct || 0)) > 1 ? 'high' : 'low',
      slippageRisk: slippageBps > 100 ? 'medium' : 'low',
      overallRisk: parseFloat(String(quote.priceImpactPct || 0)) > 1 ? 'medium' : 'low',
    },
    executeWith: 'POST /api/v1/jupiter/swap',
  };
}

async function simulateLending(params: {
  action: string;
  token: string;
  amount: number;
}) {
  const token = params.token.toUpperCase();

  // Fetch real APY from DefiLlama
  let apy = 5.0;
  try {
    const res = await fetch(DEFILLAMA_API, {
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 },
    });
    if (res.ok) {
      const data = await res.json();
      const pool = data.data.find(
        (p: any) => p.project === 'kamino-lend' && p.symbol?.toUpperCase() === token,
      );
      if (pool) apy = pool.apy;
    }
  } catch { /* use default */ }

  const dailyYield = (params.amount * apy) / 100 / 365;
  const monthlyYield = dailyYield * 30;
  const yearlyYield = (params.amount * apy) / 100;

  return {
    operation: params.action === 'deposit' ? 'lending_deposit' : 'lending_withdraw',
    status: 'simulated',
    token,
    amount: params.amount,
    currentApy: parseFloat(apy.toFixed(2)),
    projectedYield: {
      daily: parseFloat(dailyYield.toFixed(4)),
      monthly: parseFloat(monthlyYield.toFixed(2)),
      yearly: parseFloat(yearlyYield.toFixed(2)),
    },
    fees: {
      networkFeeSol: 0.000105,
      networkFeeUsd: parseFloat((0.000105 * 170).toFixed(4)),
      platformFee: 0,
    },
    riskAssessment: {
      liquidationRisk: 'none',
      smartContractRisk: 'low',
      overallRisk: 'low',
    },
    executeWith: 'POST /api/v1/kamino/deposit',
    dataSource: 'defillama',
  };
}

async function simulateLp(params: {
  token: string;
  amount: number;
  pool?: string;
}) {
  const estimatedApr = 15.0; // typical Raydium LP APR
  const dailyYield = (params.amount * estimatedApr) / 100 / 365;

  return {
    operation: 'lp_add',
    status: 'simulated',
    token: params.token.toUpperCase(),
    amount: params.amount,
    pool: params.pool || `${params.token.toUpperCase()}-USDC`,
    estimatedApr: estimatedApr,
    projectedYield: {
      daily: parseFloat(dailyYield.toFixed(4)),
      monthly: parseFloat((dailyYield * 30).toFixed(2)),
      yearly: parseFloat(((params.amount * estimatedApr) / 100).toFixed(2)),
    },
    fees: {
      networkFeeSol: 0.000105,
      networkFeeUsd: parseFloat((0.000105 * 170).toFixed(4)),
      platformFee: 0,
    },
    riskAssessment: {
      impermanentLossRisk: 'medium',
      smartContractRisk: 'low',
      liquidityRisk: 'low',
      overallRisk: 'medium',
    },
    executeWith: 'POST /api/v1/raydium/pools/add-liquidity',
  };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { operation, params } = body;

    if (!operation) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing "operation" field. Supported: swap, deposit, withdraw, add-liquidity',
          example: {
            operation: 'swap',
            params: {
              inputMint: 'SOL',
              outputMint: 'USDC',
              amount: '1000000000',
              slippageBps: 50,
            },
          },
        },
        { status: 400 },
      );
    }

    let result;

    switch (operation.toLowerCase()) {
      case 'swap': {
        if (!params?.inputMint || !params?.outputMint || !params?.amount) {
          return NextResponse.json(
            { success: false, error: 'swap requires: inputMint, outputMint, amount' },
            { status: 400 },
          );
        }
        result = await simulateSwap(params);
        break;
      }
      case 'deposit':
      case 'withdraw': {
        if (!params?.token || !params?.amount) {
          return NextResponse.json(
            { success: false, error: `${operation} requires: token, amount` },
            { status: 400 },
          );
        }
        result = await simulateLending({
          action: operation.toLowerCase(),
          token: params.token,
          amount: params.amount,
        });
        break;
      }
      case 'add-liquidity':
      case 'add_liquidity':
      case 'lp': {
        if (!params?.token || !params?.amount) {
          return NextResponse.json(
            { success: false, error: 'LP requires: token, amount' },
            { status: 400 },
          );
        }
        result = await simulateLp(params);
        break;
      }
      default:
        return NextResponse.json(
          { success: false, error: `Unknown operation: ${operation}. Supported: swap, deposit, withdraw, add-liquidity` },
          { status: 400 },
        );
    }

    return NextResponse.json({
      success: true,
      simulation: result,
      note: 'This is a dry-run simulation. No transaction was executed. Use the executeWith endpoint to execute.',
    });
  } catch (error: any) {
    console.error('Simulation error:', error);
    return NextResponse.json(
      { success: false, error: 'Simulation failed: ' + error.message },
      { status: 500 },
    );
  }
}
