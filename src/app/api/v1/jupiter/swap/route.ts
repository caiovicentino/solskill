import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';
import { db } from '@/lib/db';

const JUPITER_API = 'https://quote-api.jup.ag/v6';

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
      wrapAndUnwrapSol = true,
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

    if (!isValidSolanaAddress(inputMint) || !isValidSolanaAddress(outputMint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid mint addresses' },
        { status: 400 }
      );
    }

    // Get fresh quote from Jupiter (don't trust client-provided quotes)
    const quoteUrl = `${JUPITER_API}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    
    const quoteRes = await fetchWithTimeout(quoteUrl, {}, 15000);
    
    if (!quoteRes.ok) {
      const error = await quoteRes.text();
      return NextResponse.json(
        { success: false, error: `Failed to get quote: ${error}` },
        { status: 400 }
      );
    }

    const quoteResponse = await quoteRes.json();

    // Build swap transaction
    const swapRes = await fetchWithTimeout(`${JUPITER_API}/swap`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quoteResponse,
        userPublicKey,
        wrapAndUnwrapSol,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    }, 15000);

    if (!swapRes.ok) {
      const error = await swapRes.text();
      return NextResponse.json(
        { success: false, error: `Jupiter swap error: ${error}` },
        { status: swapRes.status }
      );
    }

    const swapData = await swapRes.json();

    // Increment usage count
    db.incrementRequestCount(apiKey);

    return NextResponse.json({
      success: true,
      swapTransaction: swapData.swapTransaction,
      lastValidBlockHeight: swapData.lastValidBlockHeight,
      prioritizationFeeLamports: swapData.prioritizationFeeLamports,
      computeUnitLimit: swapData.computeUnitLimit,
      quote: {
        inputMint: quoteResponse.inputMint,
        outputMint: quoteResponse.outputMint,
        inAmount: quoteResponse.inAmount,
        outAmount: quoteResponse.outAmount,
        priceImpactPct: quoteResponse.priceImpactPct,
      },
      instructions: {
        step1: 'Deserialize swapTransaction (base64 encoded versioned transaction)',
        step2: 'Sign with user wallet',
        step3: 'Send to Solana RPC',
        step4: 'Confirm transaction',
      },
    });
  } catch (error: any) {
    console.error('Jupiter swap error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Jupiter API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to build swap transaction' },
      { status: 500 }
    );
  }
}
