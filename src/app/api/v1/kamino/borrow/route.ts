import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, isValidAmount, fetchWithTimeout } from '@/lib/solana';
import { db } from '@/lib/db';

const KAMINO_API = 'https://api.kamino.finance';
const MAIN_MARKET = '7u3HeHxYDLhnCoErrtycNokbQYbWGzLs6JSDqGAv5PfF';

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || !db.validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Valid API key required for borrow operations' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      wallet, 
      reserve,
      amount, 
      market = MAIN_MARKET,
      action = 'borrow' // borrow | repay
    } = body;

    // Validate wallet
    if (!wallet || !isValidSolanaAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet address required' },
        { status: 400 }
      );
    }

    // Validate reserve
    if (!reserve || !isValidSolanaAddress(reserve)) {
      return NextResponse.json(
        { success: false, error: 'Valid reserve address required' },
        { status: 400 }
      );
    }

    // Validate amount
    if (!amount || !isValidAmount(amount)) {
      return NextResponse.json(
        { success: false, error: 'Valid positive amount required' },
        { status: 400 }
      );
    }

    // Validate action
    if (!['borrow', 'repay'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be "borrow" or "repay"' },
        { status: 400 }
      );
    }

    // Increment usage count
    db.incrementRequestCount(apiKey);

    // Try to build via Kamino API
    const endpoint = action === 'repay'
      ? `${KAMINO_API}/transactions/repay`
      : `${KAMINO_API}/transactions/borrow`;

    try {
      const txRes = await fetchWithTimeout(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user: wallet,
          reserve,
          amount,
          market,
        }),
      }, 15000);

      if (txRes.ok) {
        const txData = await txRes.json();

        return NextResponse.json({
          success: true,
          transaction: txData.transaction,
          blockhash: txData.blockhash,
          action,
          params: { wallet, reserve, amount, market },
          // IMPORTANT: Liquidation warning for borrow
          ...(action === 'borrow' && {
            warnings: {
              liquidationRisk: '⚠️ IMPORTANT: Borrowing increases your Loan-to-Value (LTV) ratio. If your LTV exceeds the liquidation threshold, your collateral WILL be liquidated.',
              recommendation: 'Monitor your health factor regularly. Keep LTV below 70% for safety margin.',
              checkPositions: 'Use GET /api/v1/kamino/positions?wallet=YOUR_WALLET to monitor your positions.',
            },
          }),
        });
      }
    } catch (error) {
      // Continue to fallback
    }

    // Fallback: return SDK instructions
    return NextResponse.json({
      success: true,
      requiresManualBuild: true,
      params: {
        wallet,
        reserve,
        amount,
        market,
        action,
      },
      // IMPORTANT: Liquidation warning for borrow
      ...(action === 'borrow' && {
        warnings: {
          liquidationRisk: '⚠️ IMPORTANT: Borrowing increases your Loan-to-Value (LTV) ratio. If your LTV exceeds the liquidation threshold, your collateral WILL be liquidated.',
          recommendation: 'Monitor your health factor regularly. Keep LTV below 70% for safety margin.',
          checkPositions: 'Use GET /api/v1/kamino/positions?wallet=YOUR_WALLET to monitor your positions.',
        },
      }),
      instructions: {
        sdk: '@kamino-finance/klend-sdk',
        step1: 'Initialize KaminoMarket with connection and market address',
        step2: 'Get or create obligation for user wallet',
        step3: `Build ${action} instruction with reserve and amount`,
        step4: 'Sign and send transaction to Solana RPC',
        example: `
import { KaminoMarket } from '@kamino-finance/klend-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

const connection = new Connection('YOUR_RPC_URL');
const market = await KaminoMarket.load(connection, new PublicKey('${market}'));
const reserve = market.getReserve('${reserve}');

// Build ${action} instruction
const ix = await market.${action}Instruction(
  new PublicKey('${wallet}'),
  reserve,
  ${amount}
);
        `,
        docs: 'https://github.com/Kamino-Finance/klend-sdk',
      },
    });
  } catch (error) {
    console.error(`Kamino ${req.method} error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to build transaction' },
      { status: 500 }
    );
  }
}
