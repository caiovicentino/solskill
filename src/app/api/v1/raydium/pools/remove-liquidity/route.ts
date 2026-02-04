import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, isValidAmount, fetchWithTimeout } from '@/lib/solana';
import { db } from '@/lib/db';

const RAYDIUM_API = 'https://api-v3.raydium.io';

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || !db.validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Valid API key required for liquidity operations' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      poolId,
      wallet,
      lpAmount,
      slippage = 0.5, // 0.5% default slippage
    } = body;

    // Validate pool ID
    if (!poolId || !isValidSolanaAddress(poolId)) {
      return NextResponse.json(
        { success: false, error: 'Valid pool ID required' },
        { status: 400 }
      );
    }

    // Validate wallet
    if (!wallet || !isValidSolanaAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Valid wallet address required' },
        { status: 400 }
      );
    }

    // Validate LP amount
    if (!lpAmount || !isValidAmount(lpAmount)) {
      return NextResponse.json(
        { success: false, error: 'Valid lpAmount required' },
        { status: 400 }
      );
    }

    // Validate slippage
    if (slippage < 0 || slippage > 50) {
      return NextResponse.json(
        { success: false, error: 'Slippage must be between 0 and 50' },
        { status: 400 }
      );
    }

    // Increment usage count
    db.incrementRequestCount(apiKey);

    // Get pool info for calculations
    const poolRes = await fetchWithTimeout(
      `${RAYDIUM_API}/pools/info/ids?ids=${poolId}`,
      {},
      15000
    );

    if (!poolRes.ok) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch pool info' },
        { status: 500 }
      );
    }

    const poolData = await poolRes.json();
    
    if (!poolData.success || !poolData.data || poolData.data.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Pool not found' },
        { status: 404 }
      );
    }

    const pool = poolData.data[0];

    // Calculate expected output amounts based on LP share
    const totalLpSupply = parseFloat(pool.lpAmount) || 1;
    const lpShare = parseFloat(lpAmount) / totalLpSupply;
    const expectedAmountA = lpShare * (parseFloat(pool.mintAmountA) || 0);
    const expectedAmountB = lpShare * (parseFloat(pool.mintAmountB) || 0);
    const slippageMultiplier = 1 - (slippage / 100);

    // Try to compute removal via Raydium API
    try {
      const computeRes = await fetchWithTimeout(
        `${RAYDIUM_API}/liquidity/remove/compute`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            poolId,
            lpAmount: lpAmount.toString(),
            slippage: slippage / 100,
          }),
        },
        15000
      );

      if (computeRes.ok) {
        const computeData = await computeRes.json();
        
        if (computeData.success && computeData.data) {
          // Try to get the transaction
          const txRes = await fetchWithTimeout(
            `${RAYDIUM_API}/liquidity/remove`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                poolId,
                wallet,
                lpAmount: lpAmount.toString(),
                slippage: slippage / 100,
                ...computeData.data,
              }),
            },
            15000
          );

          if (txRes.ok) {
            const txData = await txRes.json();

            return NextResponse.json({
              success: true,
              transaction: txData.data?.transaction || txData.transaction,
              estimated: {
                amountA: computeData.data?.amountA,
                amountB: computeData.data?.amountB,
                minAmountA: computeData.data?.minAmountA,
                minAmountB: computeData.data?.minAmountB,
              },
              pool: {
                id: poolId,
                tokenA: pool.mintA?.symbol,
                tokenB: pool.mintB?.symbol,
              },
            });
          }
        }
      }
    } catch (error) {
      // Continue to fallback
    }

    // Fallback: return instructions for manual transaction building
    return NextResponse.json({
      success: true,
      requiresManualBuild: true,
      params: {
        poolId,
        wallet,
        lpAmount,
        slippage,
      },
      estimated: {
        amountA: expectedAmountA,
        amountB: expectedAmountB,
        minAmountA: expectedAmountA * slippageMultiplier,
        minAmountB: expectedAmountB * slippageMultiplier,
        lpShare: lpShare * 100, // percentage
      },
      pool: {
        id: poolId,
        tokenA: {
          symbol: pool.mintA?.symbol,
          address: pool.mintA?.address,
          decimals: pool.mintA?.decimals,
        },
        tokenB: {
          symbol: pool.mintB?.symbol,
          address: pool.mintB?.address,
          decimals: pool.mintB?.decimals,
        },
        lpMint: pool.lpMint?.address || pool.lpMint,
        price: pool.price,
        type: pool.type,
        programId: pool.programId,
        tvl: pool.tvl,
        totalLpSupply,
      },
      instructions: {
        sdk: '@raydium-io/raydium-sdk-v2',
        steps: [
          '1. Initialize Raydium SDK with RPC connection',
          '2. Load pool info using poolId',
          '3. Compute withdrawal amounts with slippage',
          '4. Build removeLiquidity instruction',
          '5. Create, sign, and send transaction',
        ],
        example: `
import { Raydium } from '@raydium-io/raydium-sdk-v2';
import { Connection, Keypair } from '@solana/web3.js';

const connection = new Connection('YOUR_RPC_URL');
const raydium = await Raydium.load({
  connection,
  owner: wallet, // PublicKey
});

// For AMM pools (standard)
const { execute, transaction } = await raydium.liquidity.removeLiquidity({
  poolInfo: await raydium.api.fetchPoolById({ ids: '${poolId}' }),
  lpAmount: new BN(${lpAmount}),
  config: { slippage: ${slippage / 100} },
});

// Sign and send
const signature = await execute();

// Expected outputs:
// Token A: ~${expectedAmountA.toFixed(6)} ${pool.mintA?.symbol || 'A'}
// Token B: ~${expectedAmountB.toFixed(6)} ${pool.mintB?.symbol || 'B'}
        `,
        docs: 'https://docs.raydium.io/raydium/traders/sdks',
      },
    });
  } catch (error: any) {
    console.error('Raydium remove liquidity error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Raydium API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to build remove liquidity transaction' },
      { status: 500 }
    );
  }
}
