'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { AnimatedLogo, NavLogo } from '@/components/AnimatedLogo';
import { 
  AnimatedIcon,
  SwapIcon,
  BankIcon,
  ChartIcon,
  WalletIcon,
  WaterIcon,
  TargetIcon,
  BellIcon,
  PortfolioIcon,
} from '@/components/AnimatedIcons';
import { LoadingDots, AnimatedGradient } from '@/components/animations';

interface PortfolioData {
  wallet: string;
  totalValueUsd: number;
  totalPnlUsd: number;
  totalPnlPercent: number;
  holdings: any[];
  lending: any[];
  vaults: any[];
  liquidity: any[];
  orders: any[];
  alerts: any[];
  byProtocol: any;
  health: any;
}

export default function Dashboard() {
  const { ready, authenticated, user, logout, login } = usePrivy();
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'defi' | 'orders'>('overview');

  useEffect(() => {
    if (authenticated && user?.wallet?.address) {
      fetchPortfolio();
    }
  }, [authenticated, user?.wallet?.address]);

  const fetchPortfolio = async () => {
    setLoading(true);
    try {
      // In production, use stored API key
      const res = await fetch(`/api/v1/portfolio?wallet=${user?.wallet?.address}`, {
        headers: { 'x-api-key': 'solskill_demo' },
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio(data.portfolio);
      }
    } catch (error) {
      console.error('Failed to fetch portfolio:', error);
    }
    setLoading(false);
  };

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <LoadingDots size={120} />
        <p className="text-xl text-gray-400 mt-4 animate-pulse">Loading Dashboard...</p>
      </div>
    );
  }

  if (!authenticated) {
    return (
      <AnimatedGradient className="min-h-screen bg-black text-white">
        <div className="container mx-auto px-4 py-8">
          <nav className="flex justify-between items-center mb-16">
            <NavLogo />
            <button
              onClick={login}
              className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] text-black font-bold rounded-xl"
            >
              Connect
            </button>
          </nav>
          
          <div className="flex flex-col items-center justify-center py-32">
            <PortfolioIcon size={120} />
            <h1 className="text-4xl font-bold mt-8 mb-4">Agent Dashboard</h1>
            <p className="text-gray-400 mb-8">Connect your wallet to view your portfolio</p>
            <button
              onClick={login}
              className="px-8 py-4 bg-gradient-to-r from-[#14F195] to-[#0fd884] text-black font-bold text-lg rounded-xl"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </AnimatedGradient>
    );
  }

  return (
    <AnimatedGradient className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 px-3 py-2 bg-gray-800/50 hover:bg-gray-800 rounded-lg transition text-gray-400 hover:text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m12 19-7-7 7-7"/>
                <path d="M19 12H5"/>
              </svg>
              <span className="hidden sm:inline">Back</span>
            </Link>
            <NavLogo />
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-400 text-sm">
              {user?.wallet?.address?.slice(0, 6)}...{user?.wallet?.address?.slice(-4)}
            </span>
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </nav>

        {/* Portfolio Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <SummaryCard
            icon={<WalletIcon size={40} />}
            title="Total Value"
            value={portfolio ? `$${portfolio.totalValueUsd.toLocaleString()}` : '-'}
            loading={loading}
            color="#14F195"
          />
          <SummaryCard
            icon={<ChartIcon size={40} />}
            title="24h PnL"
            value={portfolio ? `${portfolio.totalPnlUsd >= 0 ? '+' : ''}$${portfolio.totalPnlUsd.toFixed(2)}` : '-'}
            subtitle={portfolio ? `${portfolio.totalPnlPercent >= 0 ? '+' : ''}${portfolio.totalPnlPercent.toFixed(2)}%` : ''}
            loading={loading}
            color={(portfolio?.totalPnlUsd ?? 0) >= 0 ? '#14F195' : '#FF6B6B'}
          />
          <SummaryCard
            icon={<TargetIcon size={40} />}
            title="Open Orders"
            value={portfolio ? portfolio.orders.length.toString() : '-'}
            loading={loading}
            color="#9945FF"
          />
          <SummaryCard
            icon={<BellIcon size={40} />}
            title="Active Alerts"
            value={portfolio ? portfolio.alerts.length.toString() : '-'}
            loading={loading}
            color="#00FFA3"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'overview', label: 'Overview', icon: <PortfolioIcon size={20} /> },
            { id: 'holdings', label: 'Holdings', icon: <WalletIcon size={20} /> },
            { id: 'defi', label: 'DeFi', icon: <BankIcon size={20} /> },
            { id: 'orders', label: 'Orders & Alerts', icon: <TargetIcon size={20} /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl transition whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#14F195]/20 text-[#14F195] border border-[#14F195]/30'
                  : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 border border-transparent'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <LoadingDots size={80} />
            <p className="text-gray-400 mt-4">Loading portfolio...</p>
          </div>
        ) : (
          <>
            {activeTab === 'overview' && <OverviewTab portfolio={portfolio} />}
            {activeTab === 'holdings' && <HoldingsTab portfolio={portfolio} />}
            {activeTab === 'defi' && <DeFiTab portfolio={portfolio} />}
            {activeTab === 'orders' && <OrdersTab portfolio={portfolio} />}
          </>
        )}
      </div>
    </AnimatedGradient>
  );
}

// Summary Card Component
function SummaryCard({
  icon,
  title,
  value,
  subtitle,
  loading,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  subtitle?: string;
  loading: boolean;
  color: string;
}) {
  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <span className="text-gray-400 text-sm">{title}</span>
      </div>
      {loading ? (
        <div className="h-8 bg-gray-800 rounded animate-pulse" />
      ) : (
        <div>
          <p className="text-2xl font-bold" style={{ color }}>{value}</p>
          {subtitle && (
            <p className="text-sm" style={{ color }}>{subtitle}</p>
          )}
        </div>
      )}
    </div>
  );
}

// Overview Tab
function OverviewTab({ portfolio }: { portfolio: PortfolioData | null }) {
  if (!portfolio) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Protocol Distribution */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ChartIcon size={24} />
          Protocol Distribution
        </h3>
        <div className="space-y-4">
          {Object.entries(portfolio.byProtocol).map(([protocol, data]: [string, any]) => (
            <div key={protocol}>
              <div className="flex justify-between mb-1">
                <span className="capitalize">{protocol}</span>
                <span className="text-[#14F195]">
                  {data.valueUsd ? `$${data.valueUsd.toLocaleString()}` : `${data.orders || 0} orders`}
                </span>
              </div>
              {data.valueUsd && (
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#14F195] to-[#9945FF] rounded-full transition-all duration-500"
                    style={{ width: `${(data.valueUsd / portfolio.totalValueUsd) * 100}%` }}
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Health Status */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <AnimatedIcon name="shield" size={24} />
          Health Status
        </h3>
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400">Lending LTV</span>
            <span className={`font-bold ${
              portfolio.health.lendingLtv < 50 ? 'text-[#14F195]' : 
              portfolio.health.lendingLtv < 70 ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {portfolio.health.lendingLtv.toFixed(1)}%
            </span>
          </div>
          <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                portfolio.health.lendingLtv < 50 ? 'bg-[#14F195]' : 
                portfolio.health.lendingLtv < 70 ? 'bg-yellow-400' : 'bg-red-400'
              }`}
              style={{ width: `${portfolio.health.lendingLtv}%` }}
            />
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Status</span>
            <span className={`capitalize ${
              portfolio.health.lendingHealth === 'healthy' ? 'text-[#14F195]' :
              portfolio.health.lendingHealth === 'moderate' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {portfolio.health.lendingHealth}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Liquidation Risk</span>
            <span className={`capitalize ${
              portfolio.health.liquidationRisk === 'low' ? 'text-[#14F195]' :
              portfolio.health.liquidationRisk === 'medium' ? 'text-yellow-400' : 'text-red-400'
            }`}>
              {portfolio.health.liquidationRisk}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Holdings Tab
function HoldingsTab({ portfolio }: { portfolio: PortfolioData | null }) {
  if (!portfolio) return null;

  return (
    <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
      <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
        <WalletIcon size={24} />
        Token Holdings
      </h3>
      <div className="space-y-3">
        {portfolio.holdings.map((holding, i) => (
          <div key={i} className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-xl">
                {holding.tokenSymbol === 'SOL' ? '◎' : '$'}
              </div>
              <div>
                <p className="font-bold">{holding.tokenSymbol}</p>
                <p className="text-gray-400 text-sm">{holding.balance} tokens</p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-bold">${holding.valueUsd.toLocaleString()}</p>
              <p className={`text-sm ${holding.change24h >= 0 ? 'text-[#14F195]' : 'text-red-400'}`}>
                {holding.change24h >= 0 ? '+' : ''}{holding.change24h}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// DeFi Tab
function DeFiTab({ portfolio }: { portfolio: PortfolioData | null }) {
  if (!portfolio) return null;

  return (
    <div className="space-y-6">
      {/* Lending */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BankIcon size={24} />
          Lending Positions
        </h3>
        <div className="space-y-3">
          {portfolio.lending.map((position, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  position.type === 'lending_deposit' ? 'bg-[#14F195]/20' : 'bg-red-400/20'
                }`}>
                  {position.type === 'lending_deposit' ? '↓' : '↑'}
                </div>
                <div>
                  <p className="font-bold">{position.tokenSymbol}</p>
                  <p className="text-gray-400 text-sm capitalize">
                    {position.type === 'lending_deposit' ? 'Deposited' : 'Borrowed'}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold">${Math.abs(position.valueUsd).toLocaleString()}</p>
                <p className={`text-sm ${position.apy >= 0 ? 'text-[#14F195]' : 'text-red-400'}`}>
                  {position.apy >= 0 ? '+' : ''}{position.apy}% APY
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Vaults */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <ChartIcon size={24} />
          Vault Positions
        </h3>
        <div className="space-y-3">
          {portfolio.vaults.map((vault, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
              <div>
                <p className="font-bold">{vault.vaultName}</p>
                <p className="text-gray-400 text-sm">{vault.deposited} {vault.tokenSymbol}</p>
              </div>
              <div className="text-right">
                <p className="font-bold">${vault.valueUsd.toLocaleString()}</p>
                <p className="text-[#14F195] text-sm">+{vault.apy}% APY</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Liquidity */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <WaterIcon size={24} />
          Liquidity Positions
        </h3>
        <div className="space-y-3">
          {portfolio.liquidity.map((lp, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
              <div>
                <p className="font-bold">{lp.poolName}</p>
                <p className="text-gray-400 text-sm">
                  {lp.token0.amount} {lp.token0.symbol} + {lp.token1.amount} {lp.token1.symbol}
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold">${lp.valueUsd.toLocaleString()}</p>
                <p className="text-[#14F195] text-sm">+{lp.apy}% APY</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Orders Tab
function OrdersTab({ portfolio }: { portfolio: PortfolioData | null }) {
  if (!portfolio) return null;

  return (
    <div className="space-y-6">
      {/* Orders */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <TargetIcon size={24} />
          Limit Orders
        </h3>
        {portfolio.orders.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No open orders</p>
        ) : (
          <div className="space-y-3">
            {portfolio.orders.map((order, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    order.side === 'buy' ? 'bg-[#14F195]/20 text-[#14F195]' : 'bg-red-400/20 text-red-400'
                  }`}>
                    {order.side === 'buy' ? '↓' : '↑'}
                  </div>
                  <div>
                    <p className="font-bold capitalize">{order.side} {order.outputToken}</p>
                    <p className="text-gray-400 text-sm">{order.inputAmount} {order.inputToken}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold">${order.limitPrice}</p>
                  <p className="text-yellow-400 text-sm capitalize">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Alerts */}
      <div className="bg-gray-900/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-800">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <BellIcon size={24} />
          Price Alerts
        </h3>
        {portfolio.alerts.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No active alerts</p>
        ) : (
          <div className="space-y-3">
            {portfolio.alerts.map((alert, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-black/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <BellIcon size={32} />
                  <div>
                    <p className="font-bold">{alert.tokenSymbol}</p>
                    <p className="text-gray-400 text-sm capitalize">
                      {alert.condition} ${alert.targetPrice}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm ${
                  alert.status === 'active' ? 'bg-[#14F195]/20 text-[#14F195]' : 'bg-gray-800 text-gray-400'
                }`}>
                  {alert.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
