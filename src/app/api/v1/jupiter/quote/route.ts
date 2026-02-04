import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';

// Jupiter Ultra API
const JUPITER_API = 'https://api.jup.ag/ultra/v1';
const JUPITER_API_KEY = process.env.JUPITER_API_KEY || 'a6ae79cc-4699-4de4-8b93-826698f419d4';

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

    // Validate slippage
    const slippage = parseInt(slippageBps);
    if (isNaN(slippage) || slippage < 0 || slippage > 5000) {
      return NextResponse.json(
        { success: false, error: 'slippageBps must be 0-5000 (0-50%)' },
        { status: 400 }
      );
    }

    // Call Jupiter Ultra API
    const quoteUrl = `${JUPITER_API}/order?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
    console.log(`Jupiter Ultra API: ${quoteUrl}`);
    
    const quoteRes = await fetchWithTimeout(quoteUrl, {
      headers: {
        'Accept': 'application/json',
        'x-api-key': JUPITER_API_KEY,
      }
    }, 15000);
    
    if (!quoteRes.ok) {
      const errorText = await quoteRes.text();
      console.error(`Jupiter API error: ${quoteRes.status} - ${errorText}`);
      return NextResponse.json(
        { success: false, error: `Jupiter API error: ${quoteRes.status} - ${errorText}` },
        { status: quoteRes.status }
      );
    }
    
    const quote = await quoteRes.json();
    console.log('Jupiter quote success');

    return NextResponse.json({
      success: true,
      quote: {
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        otherAmountThreshold: quote.otherAmountThreshold,
        priceImpactPct: quote.priceImpactPct,
        slippageBps: quote.slippageBps,
        // USD values from Ultra API
        inUsdValue: quote.inUsdValue,
        outUsdValue: quote.outUsdValue,
        // Router info
        router: quote.router,
        mode: quote.mode,
        // Route plan
        routePlan: quote.routePlan?.map((r: any) => ({
          swapInfo: {
            ammKey: r.swapInfo?.ammKey,
            label: r.swapInfo?.label,
            inputMint: r.swapInfo?.inputMint,
            outputMint: r.swapInfo?.outputMint,
            inAmount: r.swapInfo?.inAmount,
            outAmount: r.swapInfo?.outAmount,
          },
          percent: r.percent,
          usdValue: r.usdValue,
        })),
      },
      requestId: quote.requestId,
    });
  } catch (error: any) {
    console.error('Jupiter quote error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Jupiter API timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get quote' },
      { status: 500 }
    );
  }
}
