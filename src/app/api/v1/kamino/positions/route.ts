import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';

const KAMINO_API = 'https://api.kamino.finance';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    // Validate wallet
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Missing required param: wallet' },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address. Must be a valid Solana public key.' },
        { status: 400 }
      );
    }

    // Fetch user lending positions and vault positions in parallel
    const [lendingRes, vaultRes] = await Promise.all([
      fetchWithTimeout(`${KAMINO_API}/users/${wallet}/obligations`, {}, 15000).catch(() => null),
      fetchWithTimeout(`${KAMINO_API}/users/${wallet}/strategies`, {}, 15000).catch(() => null),
    ]);

    const positions: any = {
      lending: [],
      vaults: [],
    };

    // Parse lending positions (obligations)
    if (lendingRes?.ok) {
      const lending = await lendingRes.json();
      positions.lending = lending.map((o: any) => ({
        obligationAddress: o.pubkey,
        market: o.lendingMarket,
        // Deposits
        deposits: o.deposits?.map((d: any) => ({
          reserve: d.depositReserve,
          symbol: d.symbol,
          amount: d.depositedAmount,
          amountUsd: d.marketValueUsd,
        })),
        totalDepositedUsd: o.depositedValueUsd,
        // Borrows
        borrows: o.borrows?.map((b: any) => ({
          reserve: b.borrowReserve,
          symbol: b.symbol,
          amount: b.borrowedAmount,
          amountUsd: b.marketValueUsd,
        })),
        totalBorrowedUsd: o.borrowedValueUsd,
        // Health metrics
        loanToValue: o.loanToValue,
        liquidationLtv: o.liquidationLtv,
        netValue: o.netValueUsd,
        // Risk indicator
        healthStatus: getHealthStatus(o.loanToValue, o.liquidationLtv),
      }));
    }

    // Parse vault positions
    if (vaultRes?.ok) {
      const vaults = await vaultRes.json();
      positions.vaults = vaults.map((v: any) => ({
        strategyAddress: v.strategy,
        name: v.strategyName,
        shares: v.shares,
        sharesUsd: v.sharesValueUsd,
        tokenA: v.tokenAAmount,
        tokenB: v.tokenBAmount,
        pendingRewards: v.pendingRewards,
      }));
    }

    // Calculate totals
    const totalLendingValue = positions.lending.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.netValue) || 0),
      0
    );
    const totalVaultValue = positions.vaults.reduce(
      (sum: number, p: any) => sum + (parseFloat(p.sharesUsd) || 0),
      0
    );

    return NextResponse.json({
      success: true,
      wallet,
      positions,
      summary: {
        totalLendingValueUsd: totalLendingValue,
        totalVaultValueUsd: totalVaultValue,
        totalValueUsd: totalLendingValue + totalVaultValue,
        lendingPositions: positions.lending.length,
        vaultPositions: positions.vaults.length,
      },
    });
  } catch (error: any) {
    console.error('Kamino positions error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Kamino API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get positions' },
      { status: 500 }
    );
  }
}

// Helper to determine health status
function getHealthStatus(ltv: number | undefined, liquidationLtv: number | undefined): string {
  if (ltv === undefined || liquidationLtv === undefined) return 'unknown';
  
  const ratio = ltv / liquidationLtv;
  
  if (ratio >= 0.9) return '🔴 CRITICAL - Near liquidation!';
  if (ratio >= 0.75) return '🟠 WARNING - High risk';
  if (ratio >= 0.5) return '🟡 MODERATE - Monitor closely';
  return '🟢 HEALTHY';
}
