import { NextRequest, NextResponse } from 'next/server';

const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
};

interface RebalanceStep {
  step: number;
  action: 'swap' | 'deposit' | 'withdraw';
  from: string;
  to: string;
  amount: number;
  amountUsd: number;
  endpoint: string;
  description: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      targetAllocation,
      totalValue = 10000,
      currentHoldings,
    } = body;

    if (!targetAllocation || typeof targetAllocation !== 'object') {
      return NextResponse.json(
        { success: false, error: 'targetAllocation is required. Example: {"SOL":50,"USDC":30,"yield":20}' },
        { status: 400 },
      );
    }

    // Validate allocations sum to 100
    const totalAllocation = Object.values(targetAllocation).reduce(
      (sum: number, val: any) => sum + (typeof val === 'number' ? val : 0),
      0,
    );
    if (Math.abs(totalAllocation - 100) > 0.01) {
      return NextResponse.json(
        { success: false, error: `Allocations must sum to 100%. Current total: ${totalAllocation}%` },
        { status: 400 },
      );
    }

    // Default current holdings (100% USDC if not specified)
    const current: Record<string, number> = currentHoldings || { USDC: 100 };

    // Generate rebalance steps
    const steps: RebalanceStep[] = [];
    let stepNum = 1;

    // Calculate target amounts
    const targets: Record<string, number> = {};
    const currentAmounts: Record<string, number> = {};

    for (const [asset, pct] of Object.entries(targetAllocation)) {
      targets[asset] = (totalValue * (pct as number)) / 100;
    }

    for (const [asset, pct] of Object.entries(current)) {
      currentAmounts[asset] = (totalValue * (pct as number)) / 100;
    }

    // Determine swaps needed
    const sells: { asset: string; amount: number }[] = [];
    const buys: { asset: string; amount: number }[] = [];

    for (const asset of new Set([...Object.keys(targets), ...Object.keys(currentAmounts)])) {
      const target = targets[asset] || 0;
      const cur = currentAmounts[asset] || 0;
      const diff = target - cur;

      if (diff < -1) {
        sells.push({ asset, amount: Math.abs(diff) });
      } else if (diff > 1) {
        buys.push({ asset, amount: diff });
      }
    }

    // Generate swap steps (sell overweights into USDC, then buy underweights)
    for (const sell of sells) {
      if (sell.asset === 'yield') continue;
      steps.push({
        step: stepNum++,
        action: 'swap',
        from: sell.asset,
        to: 'USDC',
        amount: parseFloat(sell.amount.toFixed(2)),
        amountUsd: parseFloat(sell.amount.toFixed(2)),
        endpoint: 'POST /api/v1/jupiter/swap',
        description: `Sell $${sell.amount.toFixed(2)} worth of ${sell.asset}`,
      });
    }

    for (const buy of buys) {
      if (buy.asset === 'yield') {
        steps.push({
          step: stepNum++,
          action: 'deposit',
          from: 'USDC',
          to: 'Kamino Lending',
          amount: parseFloat(buy.amount.toFixed(2)),
          amountUsd: parseFloat(buy.amount.toFixed(2)),
          endpoint: 'POST /api/v1/kamino/deposit',
          description: `Deposit $${buy.amount.toFixed(2)} into Kamino lending for yield`,
        });
      } else {
        steps.push({
          step: stepNum++,
          action: 'swap',
          from: 'USDC',
          to: buy.asset,
          amount: parseFloat(buy.amount.toFixed(2)),
          amountUsd: parseFloat(buy.amount.toFixed(2)),
          endpoint: 'POST /api/v1/jupiter/swap',
          description: `Buy $${buy.amount.toFixed(2)} worth of ${buy.asset}`,
        });
      }
    }

    const estimatedSwapFees = steps.filter(s => s.action === 'swap').length * 0.000005;
    const estimatedDepositFees = steps.filter(s => s.action === 'deposit').length * 0.000005;

    return NextResponse.json({
      success: true,
      rebalance: {
        totalValue,
        targetAllocation,
        currentAllocation: current,
        steps,
        totalSteps: steps.length,
        estimatedCost: {
          networkFees: parseFloat((estimatedSwapFees + estimatedDepositFees).toFixed(6)) + ' SOL',
          swapFees: '~0.3% per swap',
          totalEstimate: `~$${(steps.length * 0.02).toFixed(2)}`,
        },
      },
      executeNote: 'Execute each step in order using the specified endpoints with your API key.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Rebalance planning failed: ' + error.message },
      { status: 500 },
    );
  }
}
