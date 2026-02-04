import { NextRequest, NextResponse } from 'next/server';

// Common token mints on Solana
const POPULAR_TOKENS = {
  SOL: 'So11111111111111111111111111111111111111112',
  USDC: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  USDT: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  BONK: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
  WIF: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm',
  JUP: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN',
  RAY: '4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R',
  ORCA: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE',
  MSOL: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  JITOSOL: 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  PYTH: 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  RENDER: 'rndrizKT3MK1iimdxRdWabcF7Zg7AR5T4nud4EkHBof',
  HNT: 'hntyVP6YFm1Hg25TN9WGLqM12b8TQmcknKrdu1oxWux',
  MOBILE: 'mb1eu7TzEc71KxDpsmsKoucSSuuoGLv1drys1oP2jh6',
  KMNO: 'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS',
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search')?.toLowerCase();
    const includeAll = searchParams.get('all') === 'true';

    let tokens = Object.entries(POPULAR_TOKENS).map(([symbol, mint]) => ({
      symbol,
      mint,
    }));

    // Filter by search term
    if (search) {
      tokens = tokens.filter(
        (t) =>
          t.symbol.toLowerCase().includes(search) ||
          t.mint.toLowerCase().includes(search)
      );
    }

    // If user wants all tokens, fetch from Jupiter
    if (includeAll) {
      try {
        const jupRes = await fetch('https://tokens.jup.ag/tokens?tags=verified');
        if (jupRes.ok) {
          const allTokens = await jupRes.json();
          return NextResponse.json({
            success: true,
            popular: tokens,
            all: allTokens.slice(0, 100), // Limit to 100 for API response size
            totalVerified: allTokens.length,
          });
        }
      } catch {
        // Fall back to popular only
      }
    }

    return NextResponse.json({
      success: true,
      tokens,
      note: 'Add ?all=true to fetch all verified Jupiter tokens',
    });
  } catch (error) {
    console.error('Tokens list error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get tokens' },
      { status: 500 }
    );
  }
}
