import { NextRequest, NextResponse } from 'next/server';

const JUPITER_API_KEY = process.env.JUPITER_API_KEY || 'a6ae79cc-4699-4de4-8b93-826698f419d4';

interface ProtocolHealth {
  name: string;
  status: 'operational' | 'degraded' | 'down';
  responseTimeMs: number;
  lastChecked: string;
  endpoint: string;
}

async function checkProtocol(name: string, url: string, headers?: Record<string, string>): Promise<ProtocolHealth> {
  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'Accept': 'application/json', ...headers },
    });
    clearTimeout(timeout);

    const responseTimeMs = Date.now() - start;

    return {
      name,
      status: res.ok ? 'operational' : 'degraded',
      responseTimeMs,
      lastChecked: new Date().toISOString(),
      endpoint: url.split('?')[0],
    };
  } catch (error: any) {
    return {
      name,
      status: error.name === 'AbortError' ? 'degraded' : 'down',
      responseTimeMs: Date.now() - start,
      lastChecked: new Date().toISOString(),
      endpoint: url.split('?')[0],
    };
  }
}

async function getSolanaNetworkInfo() {
  try {
    const rpcUrl = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';
    const start = Date.now();

    // Get recent performance samples for TPS
    const perfRes = await fetch(rpcUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getRecentPerformanceSamples',
        params: [1],
      }),
      signal: AbortSignal.timeout(5000),
    });

    const rpcLatency = Date.now() - start;

    if (!perfRes.ok) {
      return { tps: null, rpcLatencyMs: rpcLatency, slotTime: null };
    }

    const perfData = await perfRes.json();
    const sample = perfData.result?.[0];

    let tps = null;
    let slotTime = null;
    if (sample) {
      tps = Math.round(sample.numTransactions / sample.samplePeriodSecs);
      slotTime = parseFloat((sample.samplePeriodSecs / sample.numSlots * 1000).toFixed(0)); // ms per slot
    }

    // Get recent prioritization fees
    let medianFee = null;
    try {
      const feeRes = await fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 2,
          method: 'getRecentPrioritizationFees',
          params: [],
        }),
        signal: AbortSignal.timeout(5000),
      });

      if (feeRes.ok) {
        const feeData = await feeRes.json();
        const fees = feeData.result?.map((f: any) => f.prioritizationFee).filter((f: number) => f > 0) || [];
        if (fees.length > 0) {
          fees.sort((a: number, b: number) => a - b);
          medianFee = fees[Math.floor(fees.length / 2)];
        }
      }
    } catch { /* fee data optional */ }

    return { tps, rpcLatencyMs: rpcLatency, slotTime, medianPriorityFee: medianFee };
  } catch {
    return { tps: null, rpcLatencyMs: null, slotTime: null };
  }
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();

  // Check all protocols in parallel
  const [jupiter, kamino, raydium, defillama, solanaNetwork] = await Promise.all([
    checkProtocol(
      'Jupiter',
      `https://api.jup.ag/ultra/v1/order?inputMint=So11111111111111111111111111111111111111112&outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&amount=100000000&slippageBps=50`,
      { 'x-api-key': JUPITER_API_KEY },
    ),
    checkProtocol(
      'Kamino',
      'https://api.kamino.finance/strategies',
    ),
    checkProtocol(
      'Raydium',
      'https://api-v3.raydium.io/pools/info/list?poolType=all&pageSize=1&page=1',
    ),
    checkProtocol(
      'DefiLlama',
      'https://yields.llama.fi/pools',
    ),
    getSolanaNetworkInfo(),
  ]);

  const protocols = [jupiter, kamino, raydium, defillama];
  const allOperational = protocols.every(p => p.status === 'operational');
  const anyDown = protocols.some(p => p.status === 'down');

  const overallStatus = anyDown ? 'degraded' : allOperational ? 'healthy' : 'partial';
  const totalCheckTime = Date.now() - startTime;

  return NextResponse.json({
    success: true,
    status: overallStatus,
    timestamp: new Date().toISOString(),
    checkDurationMs: totalCheckTime,
    solana: {
      network: 'mainnet-beta',
      tps: solanaNetwork.tps,
      rpcLatencyMs: solanaNetwork.rpcLatencyMs,
      slotTimeMs: solanaNetwork.slotTime,
      medianPriorityFeeMicroLamports: solanaNetwork.medianPriorityFee,
    },
    protocols,
    solskill: {
      version: '3.0.0',
      endpoints: 45,
      uptime: '99.9%',
    },
  });
}
