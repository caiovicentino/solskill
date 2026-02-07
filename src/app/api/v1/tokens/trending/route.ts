import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/solana';

const DEXSCREENER_API = 'https://api.dexscreener.com/token-boosts/top/v1';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const sortBy = searchParams.get('sortBy') || 'volume';

    const res = await fetchWithTimeout(DEXSCREENER_API, {
      headers: { 'Accept': 'application/json' },
    }, 10000);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `DexScreener API error: ${res.status}` },
        { status: 502 },
      );
    }

    const data = await res.json();

    // Filter for Solana tokens
    let tokens = (Array.isArray(data) ? data : [])
      .filter((t: any) => t.chainId === 'solana')
      .slice(0, limit)
      .map((t: any, i: number) => ({
        rank: i + 1,
        tokenAddress: t.tokenAddress,
        symbol: t.symbol || t.tokenAddress?.slice(0, 6),
        name: t.name || t.description || 'Unknown',
        url: t.url || null,
        totalAmount: t.totalAmount || 0,
        chainId: t.chainId,
        icon: t.icon || null,
      }));

    // If we got tokens from DexScreener, try to enrich with price data
    if (tokens.length > 0) {
      const mintAddresses = tokens
        .map((t: any) => t.tokenAddress)
        .filter(Boolean)
        .slice(0, 20);

      if (mintAddresses.length > 0) {
        try {
          const priceRes = await fetchWithTimeout(
            `https://api.jup.ag/price/v2?ids=${mintAddresses.join(',')}`,
            { headers: { 'Accept': 'application/json' } },
            8000,
          );
          if (priceRes.ok) {
            const priceData = await priceRes.json();
            tokens = tokens.map((t: any) => {
              const price = priceData.data?.[t.tokenAddress];
              return {
                ...t,
                price: price ? parseFloat(price.price) : null,
              };
            });
          }
        } catch {
          // Price enrichment failed, continue without prices
        }
      }
    }

    return NextResponse.json({
      success: true,
      trending: tokens,
      count: tokens.length,
      source: 'dexscreener',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'DexScreener API timeout' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch trending tokens: ' + error.message },
      { status: 500 },
    );
  }
}
