import { NextRequest, NextResponse } from 'next/server';
import { connection } from '@/lib/solana';

export async function GET(req: NextRequest) {
  try {
    // Fetch recent prioritization fees and performance samples in parallel
    const [feeResults, perfSamples] = await Promise.all([
      connection.getRecentPrioritizationFees().catch(() => []),
      connection.getRecentPerformanceSamples(1).catch(() => []),
    ]);

    // Calculate priority fee tiers from recent fees
    const fees = (feeResults || [])
      .map((f: any) => f.prioritizationFee)
      .filter((f: number) => f > 0)
      .sort((a: number, b: number) => a - b);

    let lowFee = 1000;      // 1000 micro-lamports
    let mediumFee = 10000;   // 10000 micro-lamports
    let highFee = 100000;    // 100000 micro-lamports

    if (fees.length > 0) {
      lowFee = fees[Math.floor(fees.length * 0.25)] || 1000;
      mediumFee = fees[Math.floor(fees.length * 0.5)] || 10000;
      highFee = fees[Math.floor(fees.length * 0.75)] || 100000;
    }

    // Calculate TPS from performance samples
    let currentTps = 3000;
    if (perfSamples && perfSamples.length > 0) {
      const sample = perfSamples[0];
      currentTps = Math.round(sample.numTransactions / sample.samplePeriodSecs);
    }

    // Determine recommended priority based on TPS
    let recommendedPriority: 'low' | 'medium' | 'high' = 'medium';
    if (currentTps > 4000) {
      recommendedPriority = 'high';
    } else if (currentTps < 2000) {
      recommendedPriority = 'low';
    }

    return NextResponse.json({
      success: true,
      gasEstimate: {
        baseFee: 0.000005, // SOL (5000 lamports)
        baseFeelamports: 5000,
        priorityFee: {
          low: {
            microLamports: lowFee,
            sol: parseFloat((lowFee * 200000 / 1e15).toFixed(9)),
            label: 'Economy — may take longer',
          },
          medium: {
            microLamports: mediumFee,
            sol: parseFloat((mediumFee * 200000 / 1e15).toFixed(9)),
            label: 'Standard — recommended',
          },
          high: {
            microLamports: highFee,
            sol: parseFloat((highFee * 200000 / 1e15).toFixed(9)),
            label: 'Fast — priority inclusion',
          },
        },
        currentTps,
        recommendedPriority,
        network: 'mainnet-beta',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to estimate gas: ' + error.message },
      { status: 500 },
    );
  }
}
