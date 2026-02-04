import { NextRequest, NextResponse } from 'next/server';

// DefiLlama API for real yield data
const DEFILLAMA_API = 'https://yields.llama.fi/pools';

// Token mint addresses mapping
const TOKEN_MINTS: Record<string, string> = {
  'SOL': 'So11111111111111111111111111111111111111112',
  'USDC': 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
  'USDT': 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
  'MSOL': 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So',
  'JITOSOL': 'J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn',
  'BSOL': 'bSo13r4TkiE4KumL71LsHTPpL2euBYLFx6h9HP3piy1',
  'ETH': '7vfCXTUXx5WJV5JADk17DUJ4ksgau7utNKj4b963voxs',
  'WBTC': '3NZ9JMVBmGAqocybic2c7LQCJScmgsAZ6vQqTDzcqmJh',
  'CBBTC': 'cbBTC1uf7tj3M8KZ2q9za9EKqzLpWZpUYKVWiJcXHrK',
  'PYTH': 'HZ1JovNiVvGrGNiiYvEozEVgZ58xaU3RKwX8eACQBCt3',
  'PYUSD': '2b1kV6DkPAnxd5ixfnxCpjxmKwqjjaYmCZfHsFu24GXo',
  'JUPSOL': 'jupSoLaHXQiZZTSfEWMTRRgpnyFm8f6sZdosWBjx93v',
  'DSOL': 'Dso1bDeDjCQxTrWHqUUi63oBvV7Mdm6WaobLbQ7gnPQ',
  'XSOL': 'xSoL3Lj7qVbFJhLRvBPoMz9VREv2hAPLqjvKBBiNy3D',
  'XBTC': 'xBTC8fAXaBLBtQjXHmPNBwMBQKe5d6tJdSqfXpXfJxS',
};

// Token decimals
const TOKEN_DECIMALS: Record<string, number> = {
  'SOL': 9, 'USDC': 6, 'USDT': 6, 'MSOL': 9, 'JITOSOL': 9,
  'BSOL': 9, 'ETH': 8, 'WBTC': 8, 'CBBTC': 8, 'PYTH': 6,
  'PYUSD': 6, 'JUPSOL': 9, 'DSOL': 9, 'XSOL': 9, 'XBTC': 8,
};

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token')?.toUpperCase();

    // Fetch REAL data from DefiLlama
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    const res = await fetch(DEFILLAMA_API, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json' },
      next: { revalidate: 300 } // Cache for 5 minutes
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      return NextResponse.json(
        { success: false, error: `DefiLlama API error: ${res.status}` },
        { status: res.status }
      );
    }

    const data = await res.json();
    
    // Filter for Kamino Lend pools only
    const kaminoPools = data.data.filter((pool: any) => pool.project === 'kamino-lend');

    if (!kaminoPools || kaminoPools.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No Kamino lending data available from DefiLlama' },
        { status: 503 }
      );
    }

    // Format reserves from DefiLlama data
    let reserves = kaminoPools.map((pool: any) => {
      const symbol = pool.symbol?.toUpperCase() || 'UNKNOWN';
      const mint = TOKEN_MINTS[symbol] || null;
      const decimals = TOKEN_DECIMALS[symbol] || 9;

      return {
        poolId: pool.pool,
        mint,
        symbol,
        decimals,
        // APY data (DefiLlama returns as percentage, e.g., 5.06 = 5.06%)
        supplyApy: pool.apy || 0,
        apyBase: pool.apyBase || 0,
        apyReward: pool.apyReward || 0,
        // TVL
        tvlUsd: pool.tvlUsd || 0,
        // Pool info
        chain: pool.chain || 'Solana',
        underlyingTokens: pool.underlyingTokens || [],
        // Risk parameters (estimated based on asset type)
        loanToValue: symbol.includes('SOL') || symbol === 'ETH' || symbol.includes('BTC') ? 75 : 85,
        liquidationThreshold: symbol.includes('SOL') || symbol === 'ETH' || symbol.includes('BTC') ? 80 : 90,
        // Actions available
        actions: ['supply', 'withdraw'],
      };
    });

    // Filter by token if specified
    if (token) {
      reserves = reserves.filter((r: any) => 
        r.symbol?.toUpperCase() === token || 
        r.symbol?.toUpperCase().includes(token)
      );
    }

    // Sort by TVL descending (most liquid first)
    reserves.sort((a: any, b: any) => b.tvlUsd - a.tvlUsd);

    return NextResponse.json({
      success: true,
      reserves,
      count: reserves.length,
      source: 'defillama',
      protocol: 'kamino-lend',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Kamino reserves error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'DefiLlama API timeout' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch reserves: ' + error.message },
      { status: 500 }
    );
  }
}
