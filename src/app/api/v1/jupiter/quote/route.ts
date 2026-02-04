import { NextRequest, NextResponse } from 'next/server';
import { isValidSolanaAddress, fetchWithTimeout } from '@/lib/solana';

// Jupiter API - try multiple endpoints
const JUPITER_APIS = [
  'https://api.jup.ag/swap/v1',
  'https://quote-api.jup.ag/v6',
];

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

    // Try Jupiter APIs
    let quote = null;
    let lastError = '';
    
    for (const baseUrl of JUPITER_APIS) {
      try {
        const quoteUrl = `${baseUrl}/quote?inputMint=${inputMint}&outputMint=${outputMint}&amount=${amount}&slippageBps=${slippageBps}`;
        console.log(`Trying Jupiter API: ${quoteUrl}`);
        
        const quoteRes = await fetchWithTimeout(quoteUrl, {
          headers: {
            'Accept': 'application/json',
          }
        }, 15000);
        
        if (quoteRes.ok) {
          quote = await quoteRes.json();
          console.log(`Jupiter quote success from ${baseUrl}`);
          break;
        } else {
          const errorText = await quoteRes.text();
          lastError = `${baseUrl}: ${quoteRes.status} - ${errorText}`;
          console.log(`Jupiter API error: ${lastError}`);
        }
      } catch (err: any) {
        lastError = `${baseUrl}: ${err.message}`;
        console.log(`Jupiter API exception: ${lastError}`);
      }
    }
    
    if (!quote) {
      return NextResponse.json(
        { success: false, error: `Jupiter API failed: ${lastError}` },
        { status: 502 }
      );
    }

    return NextResponse.json({
      success: true,
      quote: {
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        otherAmountThreshold: quote.otherAmountThreshold,
        priceImpactPct: quote.priceImpactPct,
        routePlan: quote.routePlan?.map((r: any) => ({
          swapInfo: {
            ammKey: r.swapInfo?.ammKey,
            label: r.swapInfo?.label,
            inputMint: r.swapInfo?.inputMint,
            outputMint: r.swapInfo?.outputMint,
          },
          percent: r.percent,
        })),
      },
      // Include quote hash for swap verification
      quoteId: Buffer.from(JSON.stringify({
        inputMint: quote.inputMint,
        outputMint: quote.outputMint,
        inAmount: quote.inAmount,
        outAmount: quote.outAmount,
        timestamp: Date.now(),
      })).toString('base64'),
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
