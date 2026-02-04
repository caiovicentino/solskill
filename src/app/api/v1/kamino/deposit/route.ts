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
        { success: false, error: 'Valid API key required for deposit operations' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      wallet, 
      reserve, 
      amount, 
      market = MAIN_MARKET,
      action = 'deposit' // deposit | withdraw
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
    if (!['deposit', 'withdraw'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Action must be "deposit" or "withdraw"' },
        { status: 400 }
      );
    }

    // Increment usage count
    db.incrementRequestCount(apiKey);

    // Build transaction via Kamino API
    const endpoint = action === 'withdraw' 
      ? `${KAMINO_API}/transactions/withdraw`
      : `${KAMINO_API}/transactions/deposit`;

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
          lastValidBlockHeight: txData.lastValidBlockHeight,
          action,
          params: { wallet, reserve, amount, market },
        });
      }
    } catch (error) {
      // Continue to fallback
    }

    // Fallback: return instructions for manual transaction building
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
      instructions: {
        sdk: '@kamino-finance/klend-sdk',
        step1: 'Initialize KaminoMarket with connection and market address',
        step2: `Get reserve by address: ${reserve}`,
        step3: `Build ${action} instruction with amount: ${amount}`,
        step4: 'Create, sign, and send transaction',
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
    console.error(`Kamino deposit/withdraw error:`, error);
    return NextResponse.json(
      { success: false, error: 'Failed to build transaction' },
      { status: 500 }
    );
  }
}
