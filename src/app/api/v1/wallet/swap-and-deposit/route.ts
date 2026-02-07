import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/solana';

const JUPITER_API = 'https://api.jup.ag/ultra/v1';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || 'a6ae79cc-4699-4de4-8b93-826698f419d4';
const DEFILLAMA_API = 'https://yields.llama.fi/pools';

const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
};

const TOKEN_DECIMALS: Record<string, number> = {
  SOL: 9,
  USDC: 6,
  USDT: 6,
  JUP: 6,
  RAY: 6,
};

function resolveToken(token: string): { mint: string; symbol: string; decimals: number } | null {
  const upper = token.toUpperCase();
  if (TOKEN_MINTS[upper]) {
    return { mint: TOKEN_MINTS[upper], symbol: upper, decimals: TOKEN_DECIMALS[upper] || 6 };
  }
  // Treat as mint address
  if (token.length >= 32) {
    return { mint: token, symbol: token.slice(0, 6), decimals: 6 };
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fromToken, toToken, amount, depositVault } = body;

    if (!fromToken || !toToken || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: fromToken, toToken, amount' },
        { status: 400 },
      );
    }

    const from = resolveToken(fromToken);
    const to = resolveToken(toToken);
    if (!from) {
      return NextResponse.json(
        { success: false, error: `Unknown fromToken: ${fromToken}. Use symbol (SOL, USDC) or mint address.` },
        { status: 400 },
      );
    }
    if (!to) {
      return NextResponse.json(
        { success: false, error: `Unknown toToken: ${toToken}. Use symbol (SOL, USDC) or mint address.` },
        { status: 400 },
      );
    }

    if (parseFloat(amount) <= 0) {
      return NextResponse.json(
        { success: false, error: 'amount must be positive' },
        { status: 400 },
      );
    }

    const amountInSmallest = Math.floor(parseFloat(amount) * 10 ** from.decimals);

    // Step 1: Get Jupiter swap quote
    const [quoteRes, apyRes] = await Promise.all([
      fetchWithTimeout(
        `${JUPITER_API}/order?inputMint=${from.mint}&outputMint=${to.mint}&amount=${amountInSmallest}&slippageBps=50`,
        {
          headers: {
            'Accept': 'application/json',
            'x-api-key': JUPITER_API_KEY,
          },
        },
        15000,
      ),
      // Step 2: Fetch APY data for deposit estimate
      fetch(DEFILLAMA_API, {
        headers: { 'Accept': 'application/json' },
        next: { revalidate: 300 },
      }),
    ]);

    let swapQuote: any = null;
    if (quoteRes.ok) {
      const q = await quoteRes.json();
      swapQuote = {
        inputMint: q.inputMint,
        outputMint: q.outputMint,
        inAmount: q.inAmount,
        outAmount: q.outAmount,
        priceImpactPct: q.priceImpactPct,
        inUsdValue: q.inUsdValue,
        outUsdValue: q.outUsdValue,
      };
    } else {
      // Estimate swap if API fails
      swapQuote = {
        inputMint: from.mint,
        outputMint: to.mint,
        inAmount: String(amountInSmallest),
        outAmount: 'estimated',
        priceImpactPct: '0.1',
        note: 'Jupiter API unavailable, showing estimate',
      };
    }

    // Parse APY for deposit estimate
    let depositApy = 5.0;
    let vaultName = depositVault || `${to.symbol} Lending`;
    try {
      if (apyRes.ok) {
        const apyData = await apyRes.json();
        const kaminoPools = (apyData.data || []).filter(
          (p: any) => p.project === 'kamino-lend' && p.chain === 'Solana',
        );
        const match = kaminoPools.find(
          (p: any) => p.symbol?.toUpperCase() === to.symbol,
        );
        if (match) depositApy = match.apy || 5.0;
      }
    } catch { /* use default */ }

    const outAmountHuman = swapQuote.outAmount !== 'estimated'
      ? parseFloat(swapQuote.outAmount) / 10 ** to.decimals
      : parseFloat(amount);

    const depositEstimate = {
      vault: vaultName,
      protocol: 'Kamino',
      apy: parseFloat(depositApy.toFixed(2)),
      value: parseFloat(outAmountHuman.toFixed(4)),
      projectedYield: {
        daily: parseFloat((outAmountHuman * depositApy / 365 / 100).toFixed(4)),
        monthly: parseFloat((outAmountHuman * depositApy / 12 / 100).toFixed(4)),
        yearly: parseFloat((outAmountHuman * depositApy / 100).toFixed(4)),
      },
    };

    return NextResponse.json({
      success: true,
      swapQuote,
      depositEstimate,
      totalSteps: 2,
      steps: [
        {
          step: 1,
          action: 'swap',
          description: `Swap ${amount} ${from.symbol} to ${to.symbol} via Jupiter`,
          endpoint: 'POST /api/v1/jupiter/swap',
        },
        {
          step: 2,
          action: 'deposit',
          description: `Deposit ${to.symbol} into ${vaultName}`,
          endpoint: 'POST /api/v1/kamino/deposit',
        },
      ],
      estimatedFees: {
        swapFee: '~0.000005 SOL',
        depositFee: '~0.000005 SOL',
        totalFee: '~0.00001 SOL',
      },
      note: 'This is a quote/estimate. Execute each step separately with your API key.',
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'External API timeout' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Swap-and-deposit failed: ' + error.message },
      { status: 500 },
    );
  }
}
