import { NextRequest, NextResponse } from 'next/server';
import { fetchWithTimeout } from '@/lib/solana';

const DEFILLAMA_PROTOCOLS = 'https://api.llama.fi/protocols';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const category = searchParams.get('category'); // Lending, DEX, Yield, etc.

    const res = await fetchWithTimeout(DEFILLAMA_PROTOCOLS, {
      headers: { 'Accept': 'application/json' },
    }, 15000);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `DefiLlama API error: ${res.status}` },
        { status: 502 },
      );
    }

    const protocols = await res.json();

    // Filter for Solana protocols
    let solanaProtocols = (protocols || [])
      .filter((p: any) => {
        const chains = p.chains || [];
        return chains.includes('Solana') && (p.tvl || 0) > 0;
      })
      .map((p: any) => ({
        name: p.name,
        slug: p.slug,
        category: p.category || 'Other',
        tvl: Math.round(p.tvl || 0),
        tvlChange24h: parseFloat((p.change_1d || 0).toFixed(2)),
        tvlChange7d: parseFloat((p.change_7d || 0).toFixed(2)),
        tvlChange30d: parseFloat((p.change_1m || 0).toFixed(2)),
        chains: p.chains,
        logo: p.logo || null,
        url: p.url || null,
      }));

    // Filter by category if specified
    if (category) {
      const categories = category.split('|').map(c => c.toLowerCase());
      solanaProtocols = solanaProtocols.filter((p: any) =>
        categories.includes(p.category.toLowerCase()),
      );
    }

    // Sort by TVL descending
    solanaProtocols.sort((a: any, b: any) => b.tvl - a.tvl);

    // Limit results
    solanaProtocols = solanaProtocols.slice(0, limit);

    // Calculate totals
    const totalTvl = solanaProtocols.reduce((sum: number, p: any) => sum + p.tvl, 0);
    const categoryBreakdown: Record<string, number> = {};
    for (const p of solanaProtocols) {
      categoryBreakdown[p.category] = (categoryBreakdown[p.category] || 0) + p.tvl;
    }

    return NextResponse.json({
      success: true,
      chain: 'Solana',
      totalTvl,
      protocolCount: solanaProtocols.length,
      categoryBreakdown,
      protocols: solanaProtocols,
      source: 'defillama',
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'DefiLlama API timeout' },
        { status: 504 },
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to fetch TVL data: ' + error.message },
      { status: 500 },
    );
  }
}
