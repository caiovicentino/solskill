import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';
import { db } from '@/lib/db';

// Jupiter Ultra API (consistent with quote endpoint)
const JUPITER_API = 'https://api.jup.ag/ultra/v1';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || 'a6ae79cc-4699-4de4-8b93-826698f419d4';

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

    // Get order from Jupiter Ultra API (quote + swap in one call)
    const orderUrl = `${JUPITER_API}/order`;

    const orderRes = await fetchWithTimeout(orderUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'x-api-key': JUPITER_API_KEY,
      },
      body: JSON.stringify({
        inputMint,
        outputMint,
        amount: amount.toString(),
        taker: userPublicKey,
        slippageBps: parseInt(slippageBps.toString()),
      }),
    }, 15000);

    if (!orderRes.ok) {
      const error = await orderRes.text();
      console.error(`Jupiter Ultra swap error: ${orderRes.status} - ${error}`);
      return NextResponse.json(
        { success: false, error: `Jupiter swap error: ${orderRes.status} - ${error}` },
        { status: orderRes.status }
      );
    }

    const orderData = await orderRes.json();

    // Increment usage count
    db.incrementRequestCount(apiKey);

    return NextResponse.json({
      success: true,
      // Ultra API returns transaction directly
      transaction: orderData.transaction,
      requestId: orderData.requestId,
      quote: {
        inputMint: orderData.inputMint || inputMint,
        outputMint: orderData.outputMint || outputMint,
        inAmount: orderData.inAmount,
        outAmount: orderData.outAmount,
        priceImpactPct: orderData.priceImpactPct,
      },
      instructions: {
        step1: 'Deserialize the transaction (base64 encoded)',
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
