'use client';

import { useState } from 'react';
import Link from 'next/link';
import { NavLogo } from '@/components/AnimatedLogo';

const API_EXAMPLES = [
  {
    id: 'quote',
    name: 'Get Swap Quote',
    method: 'GET',
    endpoint: '/api/v1/jupiter/quote',
    description: 'Get a real-time swap quote from Jupiter Ultra API',
    params: [
      { name: 'inputMint', value: 'So11111111111111111111111111111111111111112', desc: 'SOL mint address' },
      { name: 'outputMint', value: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', desc: 'USDC mint address' },
      { name: 'amount', value: '1000000000', desc: '1 SOL in lamports' },
    ],
    auth: false,
  },
  {
    id: 'tokens',
    name: 'List Tokens',
    method: 'GET',
    endpoint: '/api/v1/jupiter/tokens',
    description: 'Get list of supported tokens for swaps',
    params: [],
    auth: false,
  },
  {
    id: 'pools',
    name: 'Raydium Pools',
    method: 'GET',
    endpoint: '/api/v1/raydium/pools',
    description: 'Get liquidity pools with TVL and APY data',
    params: [
      { name: 'minTvl', value: '1000000', desc: 'Minimum TVL in USD' },
    ],
    auth: false,
  },
  {
    id: 'kamino-vaults',
    name: 'Kamino Vaults',
    method: 'GET',
    endpoint: '/api/v1/kamino/vaults',
    description: 'Get yield-bearing vaults with APY',
    params: [
      { name: 'token', value: 'SOL', desc: 'Filter by token symbol' },
    ],
    auth: false,
  },
  {
    id: 'kamino-markets',
    name: 'Kamino Markets',
    method: 'GET',
    endpoint: '/api/v1/kamino/markets',
    description: 'Get lending markets with supply/borrow rates',
    params: [],
    auth: false,
  },
  {
    id: 'portfolio',
    name: 'Get Portfolio',
    method: 'GET',
    endpoint: '/api/v1/portfolio',
    description: 'Get wallet portfolio with all positions',
    params: [
      { name: 'wallet', value: 'YOUR_WALLET_ADDRESS', desc: 'Solana wallet address' },
    ],
    auth: true,
  },
  {
    id: 'stats',
    name: 'Platform Stats',
    method: 'GET',
    endpoint: '/api/v1/stats',
    description: 'Get live platform statistics',
    params: [],
    auth: false,
  },
];

export default function DocsPage() {
  const [activeExample, setActiveExample] = useState(API_EXAMPLES[0]);
  const [response, setResponse] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  const runExample = async () => {
    setLoading(true);
    setResponse(null);

    try {
      const params = new URLSearchParams();
      activeExample.params.forEach(p => {
        if (p.value && p.value !== 'YOUR_WALLET_ADDRESS') {
          params.append(p.name, p.value);
        }
      });

      const url = `${activeExample.endpoint}${params.toString() ? '?' + params.toString() : ''}`;
      
      const headers: Record<string, string> = {
        'Accept': 'application/json',
      };
      
      if (activeExample.auth && apiKey) {
        headers['x-api-key'] = apiKey;
      }

      const res = await fetch(url, { headers });
      const data = await res.json();
      setResponse(data);
    } catch (err: any) {
      setResponse({ error: err.message });
    }

    setLoading(false);
  };

  const getCurlCommand = () => {
    const params = activeExample.params
      .filter(p => p.value && p.value !== 'YOUR_WALLET_ADDRESS')
      .map(p => `${p.name}=${p.value}`)
      .join('&');
    
    const url = `https://solskill.ai${activeExample.endpoint}${params ? '?' + params : ''}`;
    
    let cmd = `curl "${url}"`;
    if (activeExample.auth) {
      cmd += ` \\\n  -H "x-api-key: YOUR_API_KEY"`;
    }
    return cmd;
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-black/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Link href="/">
              <NavLogo />
            </Link>
            <span className="text-gray-500">/</span>
            <span className="font-bold">API Docs</span>
          </div>
          <div className="flex gap-4">
            <a 
              href="/skill.md" 
              target="_blank"
              className="text-gray-400 hover:text-[#14F195] transition text-sm"
            >
              📄 Skill File
            </a>
            <a 
              href="https://github.com/caiovicentino/solskill" 
              target="_blank"
              className="text-gray-400 hover:text-white transition text-sm"
            >
              GitHub
            </a>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-2">
              <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-4">Endpoints</h3>
              {API_EXAMPLES.map(example => (
                <button
                  key={example.id}
                  onClick={() => { setActiveExample(example); setResponse(null); }}
                  className={`w-full text-left px-4 py-3 rounded-lg transition ${
                    activeExample.id === example.id
                      ? 'bg-[#14F195]/20 text-[#14F195] border border-[#14F195]/30'
                      : 'bg-gray-900/50 hover:bg-gray-800 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono px-2 py-0.5 rounded ${
                      example.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                    }`}>
                      {example.method}
                    </span>
                    <span className="text-sm">{example.name}</span>
                  </div>
                  {example.auth && (
                    <span className="text-xs text-yellow-500 mt-1 block">🔐 Auth required</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Endpoint Info */}
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
              <div className="flex items-center gap-3 mb-4">
                <span className={`text-sm font-mono px-3 py-1 rounded ${
                  activeExample.method === 'GET' ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
                }`}>
                  {activeExample.method}
                </span>
                <code className="text-lg">{activeExample.endpoint}</code>
              </div>
              <p className="text-gray-400 mb-4">{activeExample.description}</p>
              
              {/* Parameters */}
              {activeExample.params.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-sm text-gray-500 mb-2">Parameters</h4>
                  <div className="space-y-2">
                    {activeExample.params.map(param => (
                      <div key={param.name} className="flex items-center gap-4 bg-black/30 rounded-lg p-3">
                        <code className="text-[#14F195] text-sm w-32">{param.name}</code>
                        <input
                          type="text"
                          value={param.value}
                          onChange={(e) => {
                            const newParams = [...activeExample.params];
                            const idx = newParams.findIndex(p => p.name === param.name);
                            newParams[idx] = { ...param, value: e.target.value };
                            setActiveExample({ ...activeExample, params: newParams });
                          }}
                          className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-1 text-sm"
                        />
                        <span className="text-gray-500 text-xs">{param.desc}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* API Key (if needed) */}
              {activeExample.auth && (
                <div className="mb-4">
                  <h4 className="text-sm text-gray-500 mb-2">API Key</h4>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="solskill_your_api_key_here"
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm"
                  />
                </div>
              )}

              {/* Run Button */}
              <button
                onClick={runExample}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] text-black font-bold rounded-lg hover:opacity-90 transition disabled:opacity-50"
              >
                {loading ? '⏳ Running...' : '▶️ Run Example'}
              </button>
            </div>

            {/* cURL Command */}
            <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm text-gray-500">cURL Command</h4>
                <button
                  onClick={() => navigator.clipboard.writeText(getCurlCommand())}
                  className="text-xs text-gray-400 hover:text-white transition"
                >
                  📋 Copy
                </button>
              </div>
              <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-gray-300">
                {getCurlCommand()}
              </pre>
            </div>

            {/* Response */}
            {response && (
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-800">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="text-sm text-gray-500">Response</h4>
                  <span className={`text-xs px-2 py-1 rounded ${
                    response.success ? 'bg-[#14F195]/20 text-[#14F195]' : 'bg-red-500/20 text-red-400'
                  }`}>
                    {response.success ? '✓ Success' : '✗ Error'}
                  </span>
                </div>
                <pre className="bg-black/50 rounded-lg p-4 overflow-x-auto text-sm text-gray-300 max-h-96">
                  {JSON.stringify(response, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
