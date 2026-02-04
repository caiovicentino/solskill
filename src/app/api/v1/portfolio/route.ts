import { NextRequest, NextResponse } from 'next/server';

// Mock token prices (in production, fetch from Jupiter/CoinGecko)
const TOKEN_PRICES: Record<string, number> = {
  'So11111111111111111111111111111111111111112': 150, // SOL
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 1, // USDC
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 1, // USDT
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 0.85, // JUP
  'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS': 0.15, // KMNO
};

const TOKEN_SYMBOLS: Record<string, string> = {
  'So11111111111111111111111111111111111111112': 'SOL',
  'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v': 'USDC',
  'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB': 'USDT',
  'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN': 'JUP',
  'KMNo3nJsBXfcpJTVhZcXLW7RmTwTt4GVFE7suUBo9sS': 'KMNO',
};

// GET /api/v1/portfolio - Get consolidated portfolio across all protocols
export async function GET(request: NextRequest) {
  try {
    const apiKey = request.headers.get('x-api-key');
    
    if (!apiKey || !apiKey.startsWith('solskill_')) {
      return NextResponse.json({
        success: false,
        error: 'API key required. Include x-api-key header with your solskill_* key.',
      }, { status: 401 });
    }

    const wallet = request.nextUrl.searchParams.get('wallet');
    
    if (!wallet) {
      return NextResponse.json({
        success: false,
        error: 'wallet parameter is required',
      }, { status: 400 });
    }

    // Mock portfolio data (in production, aggregate from all protocols)
    const portfolio = {
      wallet,
      lastUpdated: new Date().toISOString(),
      
      // Total value
      totalValueUsd: 0,
      totalPnlUsd: 0,
      totalPnlPercent: 0,
      
      // Wallet holdings
      holdings: [
        {
          type: 'token',
          protocol: 'wallet',
          tokenMint: 'So11111111111111111111111111111111111111112',
          tokenSymbol: 'SOL',
          balance: '5.5',
          valueUsd: 825,
          priceUsd: 150,
          change24h: 2.5,
        },
        {
          type: 'token',
          protocol: 'wallet',
          tokenMint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
          tokenSymbol: 'USDC',
          balance: '1250.00',
          valueUsd: 1250,
          priceUsd: 1,
          change24h: 0,
        },
      ],
      
      // Lending positions
      lending: [
        {
          type: 'lending_deposit',
          protocol: 'kamino',
          tokenSymbol: 'SOL',
          deposited: '2.0',
          valueUsd: 300,
          apy: 5.2,
          earned: '0.05',
          earnedUsd: 7.5,
        },
        {
          type: 'lending_borrow',
          protocol: 'kamino',
          tokenSymbol: 'USDC',
          borrowed: '100',
          valueUsd: -100,
          apy: -8.5,
          interest: '2.5',
          interestUsd: 2.5,
        },
      ],
      
      // Vault positions
      vaults: [
        {
          type: 'vault',
          protocol: 'kamino',
          vaultName: 'SOL-USDC Multiply',
          deposited: '1.5',
          tokenSymbol: 'SOL',
          valueUsd: 225,
          apy: 15.8,
          earned: '0.02',
          earnedUsd: 3,
        },
      ],
      
      // LP positions
      liquidity: [
        {
          type: 'lp',
          protocol: 'raydium',
          poolName: 'SOL-USDC',
          lpTokens: '150.5',
          valueUsd: 450,
          token0: { symbol: 'SOL', amount: '1.5' },
          token1: { symbol: 'USDC', amount: '225' },
          apy: 25.3,
          fees24h: 1.25,
        },
      ],
      
      // Open orders
      orders: [
        {
          type: 'limit_order',
          protocol: 'solskill',
          side: 'buy',
          inputToken: 'USDC',
          outputToken: 'SOL',
          inputAmount: '500',
          limitPrice: 140,
          status: 'open',
        },
      ],
      
      // Active alerts
      alerts: [
        {
          type: 'price_alert',
          protocol: 'solskill',
          tokenSymbol: 'SOL',
          condition: 'above',
          targetPrice: 200,
          status: 'active',
        },
      ],
      
      // Summary by protocol
      byProtocol: {
        wallet: { valueUsd: 2075, positions: 2 },
        kamino: { valueUsd: 425, positions: 3 },
        raydium: { valueUsd: 450, positions: 1 },
        solskill: { orders: 1, alerts: 1 },
      },
      
      // Health metrics
      health: {
        lendingLtv: 33.3,
        lendingHealth: 'healthy', // healthy, moderate, warning, critical
        liquidationRisk: 'low',
        totalBorrowed: 100,
        totalCollateral: 300,
      },
    };

    // Calculate totals
    portfolio.totalValueUsd = 
      portfolio.holdings.reduce((sum, h) => sum + h.valueUsd, 0) +
      portfolio.lending.filter(l => l.type === 'lending_deposit').reduce((sum, l) => sum + l.valueUsd, 0) +
      portfolio.vaults.reduce((sum, v) => sum + v.valueUsd, 0) +
      portfolio.liquidity.reduce((sum, l) => sum + l.valueUsd, 0);
    
    portfolio.totalPnlUsd = 45.5; // Mock PnL
    portfolio.totalPnlPercent = (portfolio.totalPnlUsd / (portfolio.totalValueUsd - portfolio.totalPnlUsd)) * 100;

    return NextResponse.json({
      success: true,
      portfolio,
    });
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message || 'Failed to fetch portfolio',
    }, { status: 500 });
  }
}
