import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';
import { db } from '@/lib/db';

const RAYDIUM_API = 'https://transaction-v1.raydium.io';

export async function POST(req: NextRequest) {
  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey || !db.validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Valid API key required for swap operations' },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { 
      inputMint,
      outputMint,
      amount,
      userPublicKey, 
      slippageBps = 50,
      computeUnitPriceMicroLamports = 50000,
    } = body;

    // Validate user public key
    if (!userPublicKey || !isValidSolanaAddress(userPublicKey)) {
      return NextResponse.json(
        { success: false, error: 'Valid userPublicKey required' },
        { status: 400 }
      );
    }

    // Validate swap params
    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required params: inputMint, outputMint, amount' },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(inputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid inputMint address' },
        { status: 400 }
      );
    }

    if (!isValidSolanaAddress(outputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid outputMint address' },
        { status: 400 }
      );
    }

    // Validate amount
    const amountNum = parseInt(amount.toString());
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive integer (in smallest unit)' },
        { status: 400 }
      );
    }

    // Validate slippage
    const slippage = parseInt(slippageBps.toString());
    if (isNaN(slippage) || slippage < 0 || slippage > 5000) {
      return NextResponse.json(
        { success: false, error: 'slippageBps must be 0-5000 (0-50%)' },
        { status: 400 }
      );
    }

    // First, get fresh quote from Raydium (don't trust client-provided quotes)
    const quoteUrl = `${RAYDIUM_API}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&txVersion=V0`;
    
    const quoteRes = await fetchWithTimeout(quoteUrl, {}, 15000);
    
    if (!quoteRes.ok) {
      const error = await quoteRes.text();
      return NextResponse.json(
        { success: false, error: `Failed to get Raydium quote: ${error}` },
        { status: 400 }
      );
    }

    const quoteResponse = await quoteRes.json();
    
    if (!quoteResponse.success) {
      return NextResponse.json(
        { success: false, error: quoteResponse.msg || 'Raydium quote failed' },
        { status: 400 }
      );
    }

    // Build swap transaction using Raydium transaction API
    const swapRes = await fetchWithTimeout(`${RAYDIUM_API}/transaction/swap-base-in`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        computeUnitPriceMicroLamports: computeUnitPriceMicroLamports.toString(),
        swapResponse: quoteResponse,
        txVersion: 'V0',
        wallet: userPublicKey,
        wrapSol: true,
        unwrapSol: true,
      }),
    }, 15000);

    if (!swapRes.ok) {
      const error = await swapRes.text();
      return NextResponse.json(
        { success: false, error: `Raydium swap error: ${error}` },
        { status: swapRes.status }
      );
    }

    const swapData = await swapRes.json();

    if (!swapData.success) {
      return NextResponse.json(
        { success: false, error: swapData.msg || 'Raydium swap transaction build failed' },
        { status: 400 }
      );
    }

    // Increment usage count
    db.incrementRequestCount(apiKey);

    const quoteData = quoteResponse.data;

    return NextResponse.json({
      success: true,
      swapTransactions: swapData.data, // Array of versioned transactions (base64)
      quote: {
        inputMint: quoteData.inputMint,
        outputMint: quoteData.outputMint,
        inAmount: quoteData.inputAmount,
        outAmount: quoteData.outputAmount,
        otherAmountThreshold: quoteData.otherAmountThreshold,
        priceImpact: quoteData.priceImpactPct ?? 0,
        route: quoteData.routePlan?.map((r: any) => ({
          poolId: r.poolId,
          inputMint: r.inputMint,
          outputMint: r.outputMint,
        })) || [],
      },
      instructions: {
        step1: 'Deserialize swapTransactions (array of base64 versioned transactions)',
        step2: 'Sign each transaction with user wallet',
        step3: 'Send to Solana RPC in order',
        step4: 'Confirm all transactions',
      },
    });
  } catch (error: any) {
    console.error('Raydium swap error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Raydium API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to build swap transaction' },
      { status: 500 }
    );
  }
}
