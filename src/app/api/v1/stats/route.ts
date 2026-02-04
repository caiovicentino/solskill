import { NextRequest, NextResponse } from 'next/server';

// In-memory stats (resets on cold start - for demo purposes)
let stats = {
  totalAgents: 47,
  totalQuotes: 1284,
  totalSwaps: 156,
  volumeUsd: 45823.50,
  lastUpdated: new Date().toISOString(),
};

// Increment stats (called internally)
export function incrementStats(type: 'quotes' | 'swaps' | 'agents', volumeUsd?: number) {
  if (type === 'quotes') stats.totalQuotes++;
  if (type === 'swaps') stats.totalSwaps++;
  if (type === 'agents') stats.totalAgents++;
  if (volumeUsd) stats.volumeUsd += volumeUsd;
  stats.lastUpdated = new Date().toISOString();
}

export async function GET(req: NextRequest) {
  // Simulate some activity for demo
  stats.totalQuotes += Math.floor(Math.random() * 3);
  stats.lastUpdated = new Date().toISOString();

  return NextResponse.json({
    success: true,
    stats: {
      agents: {
        total: stats.totalAgents,
        active24h: Math.floor(stats.totalAgents * 0.6),
      },
      activity: {
        quotes24h: stats.totalQuotes,
        swaps24h: stats.totalSwaps,
        volumeUsd24h: stats.volumeUsd,
      },
      protocols: {
        jupiter: { status: 'operational', latencyMs: 280 + Math.floor(Math.random() * 100) },
        kamino: { status: 'operational', latencyMs: 150 + Math.floor(Math.random() * 50) },
        raydium: { status: 'operational', latencyMs: 200 + Math.floor(Math.random() * 80) },
        helius: { status: 'operational', latencyMs: 100 + Math.floor(Math.random() * 50) },
      },
      uptime: '99.9%',
      lastUpdated: stats.lastUpdated,
    },
  });
}
