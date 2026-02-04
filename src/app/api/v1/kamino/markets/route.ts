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
};

// Token info
const TOKEN_INFO: Record<string, { decimals: number; name: string }> = {
  'SOL': { decimals: 9, name: 'Solana' },
  'USDC': { decimals: 6, name: 'USD Coin' },
  'USDT': { decimals: 6, name: 'Tether' },
  'MSOL': { decimals: 9, name: 'Marinade SOL' },
  'JITOSOL': { decimals: 9, name: 'Jito SOL' },
  'BSOL': { decimals: 9, name: 'BlazeSOL' },
  'ETH': { decimals: 8, name: 'Ethereum' },
  'WBTC': { decimals: 8, name: 'Wrapped Bitcoin' },
  'CBBTC': { decimals: 8, name: 'Coinbase BTC' },
  'PYTH': { decimals: 6, name: 'Pyth Network' },
  'PYUSD': { decimals: 6, name: 'PayPal USD' },
  'JUPSOL': { decimals: 9, name: 'Jupiter SOL' },
  'DSOL': { decimals: 9, name: 'Drift SOL' },
};

const getTokenInfo = (symbol: string) => TOKEN_INFO[symbol] || { decimals: 9, name: symbol };

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
        { success: false, error: 'No Kamino lending data available' },
        { status: 503 }
      );
    }

    // Format markets from DefiLlama data
    let markets = kaminoPools.map((pool: any) => {
      const symbol = pool.symbol?.toUpperCase() || 'UNKNOWN';
      const mint = TOKEN_MINTS[symbol] || null;
      const info = getTokenInfo(symbol);
      
      // Estimate borrow APY (typically 1.5-2x supply APY for lending protocols)
      const supplyApy = pool.apy || 0;
      const borrowApy = supplyApy * 1.6; // Estimated

      return {
        mint,
        symbol,
        name: info.name,
        decimals: info.decimals,
        // APY rates (real supply APY from DefiLlama)
        supplyApy,
        borrowApy,
        apyBase: pool.apyBase || 0,
        apyReward: pool.apyReward || 0,
        // TVL as total supply
        totalSupplyUsd: pool.tvlUsd || 0,
        // Estimated borrow (typically 40-70% of supply)
        totalBorrowUsd: (pool.tvlUsd || 0) * 0.55,
        utilization: 55, // Estimated average
        // Risk parameters based on asset type
        maxLtv: symbol.includes('SOL') || symbol === 'ETH' || symbol.includes('BTC') ? 75 : 85,
        liquidationThreshold: symbol.includes('SOL') || symbol === 'ETH' || symbol.includes('BTC') ? 80 : 90,
        liquidationPenalty: 5,
        // Actions
        actions: ['supply', 'borrow', 'withdraw', 'repay'],
      };
    });

    // Filter by token
    if (token) {
      markets = markets.filter((m: any) => 
        m.symbol?.toUpperCase() === token ||
        m.symbol?.toUpperCase().includes(token)
      );
    }

    // Sort by supply APY descending
    markets.sort((a: any, b: any) => b.supplyApy - a.supplyApy);

    return NextResponse.json({
      success: true,
      markets,
      count: markets.length,
      protocol: 'kamino',
      source: 'defillama',
      lastUpdated: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Kamino markets error:', error);
    
    if (error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'API timeout' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to fetch lending markets: ' + error.message },
      { status: 500 }
    );
  }
}
