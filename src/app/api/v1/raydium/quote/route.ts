import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';

const RAYDIUM_API = 'https://transaction-v1.raydium.io';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const inputMint = searchParams.get('inputMint');
    const outputMint = searchParams.get('outputMint');
    const amount = searchParams.get('amount');
    const slippageBps = searchParams.get('slippageBps') || '50';

    // Validate required params
    if (!inputMint || !outputMint || !amount) {
      return NextResponse.json(
        { success: false, error: 'Missing required params: inputMint, outputMint, amount' },
        { status: 400 }
      );
    }

    // Validate mint addresses
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
    const amountNum = parseInt(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return NextResponse.json(
        { success: false, error: 'Amount must be a positive integer (in smallest unit)' },
        { status: 400 }
      );
    }

    // Validate slippage (0-5000 bps = 0-50%)
    const slippage = parseInt(slippageBps);
    if (isNaN(slippage) || slippage < 0 || slippage > 5000) {
      return NextResponse.json(
        { success: false, error: 'slippageBps must be 0-5000 (0-50%)' },
        { status: 400 }
      );
    }

    // Get quote from Raydium
    const quoteUrl = `${RAYDIUM_API}/compute/swap-base-in?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}&txVersion=V0`;
    
    const quoteRes = await fetchWithTimeout(quoteUrl, {}, 15000);
    
    if (!quoteRes.ok) {
      const error = await quoteRes.text();
      return NextResponse.json(
        { success: false, error: `Raydium API error: ${error}` },
        { status: quoteRes.status }
      );
    }

    const response = await quoteRes.json();

    if (!response.success) {
      return NextResponse.json(
        { success: false, error: response.msg || 'Raydium quote failed' },
        { status: 400 }
      );
    }

    const data = response.data;

    // Calculate price impact percentage
    const priceImpactPct = data.priceImpactPct ?? 0;

    return NextResponse.json({
      success: true,
      inputMint: data.inputMint,
      outputMint: data.outputMint,
      inAmount: data.inputAmount,
      outAmount: data.outputAmount,
      otherAmountThreshold: data.otherAmountThreshold,
      priceImpact: priceImpactPct,
      slippageBps: data.slippageBps,
      route: data.routePlan?.map((r: any) => ({
        poolId: r.poolId,
        inputMint: r.inputMint,
        outputMint: r.outputMint,
        feeRate: r.feeRate,
        feeAmount: r.feeAmount,
      })) || [],
      // Include quote data for swap verification
      quoteId: Buffer.from(JSON.stringify({
        inputMint: data.inputMint,
        outputMint: data.outputMint,
        inAmount: data.inputAmount,
        outAmount: data.outputAmount,
        timestamp: Date.now(),
      })).toString('base64'),
    });
  } catch (error: any) {
    console.error('Raydium quote error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Raydium API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get quote from Raydium' },
      { status: 500 }
    );
  }
}
