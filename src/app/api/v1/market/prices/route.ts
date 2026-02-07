import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/solana';

const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';

const TOKEN_MINTS: Record<string, string> = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  JITO: 'jtojtomepa8beP8AuQc6eXt5FriJwfFMwQx2v2f9mCL',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  MNDE: 'MNDEFzGvMt87ueuHvVU9VcTqsAP5b3fTGPsHuuPA5ey',
};

const MINT_TO_SYMBOL: Record<string, string> = {};
for (const [symbol, mint] of Object.entries(TOKEN_MINTS)) {
  MINT_TO_SYMBOL[mint] = symbol;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tokensParam = searchParams.get('tokens');

    // Filter mints if tokens param provided
    let mintIds: string[];
    if (tokensParam) {
      const requestedTokens = tokensParam.split(',').map(t => t.trim().toUpperCase());
      mintIds = requestedTokens
        .map(t => TOKEN_MINTS[t])
        .filter(Boolean);
      if (mintIds.length === 0) {
        return NextResponse.json(
          { success: false, error: `No valid tokens found. Available: ${Object.keys(TOKEN_MINTS).join(', ')}` },
          { status: 400 },
        );
      }
    } else {
      mintIds = Object.values(TOKEN_MINTS);
    }

    const url = `${JUPITER_PRICE_API}?ids=${mintIds.join(',')}`;
    const res = await fetchWithTimeout(url, {
      headers: { 'Accept': 'application/json' },
    }, 10000);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `Jupiter Price API error: ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();
    const prices: Record<string, { price: number; symbol: string; mint: string }> = {};

    for (const [mint, info] of Object.entries(data.data || {})) {
      const symbol = MINT_TO_SYMBOL[mint] || (info as any).mintSymbol || 'UNKNOWN';
      prices[symbol] = {
        price: parseFloat((info as any).price) || 0,
        symbol,
        mint,
      };
    }

    return NextResponse.json({
      success: true,
      prices,
      count: Object.keys(prices).length,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Jupiter Price API timeout' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch prices: ' + error.message },
      { status: 500 },
    );
  }
}
