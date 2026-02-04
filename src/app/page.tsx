'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import {
  LoadingDots,
  FloatingWrapper,
  AnimatedGradient,
} from '@/components/animations';
import { HeroRobotInteractive } from '@/components/HeroRobotInteractive';
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
  DocumentIcon,
  RocketIcon,
  PortfolioIcon,
} from '@/components/AnimatedIcons';
import RegisterFlow from '@/components/RegisterFlow';
import LiveSwapDemo from '@/components/LiveSwapDemo';
import PriceTicker from '@/components/PriceTicker';
import LiveStats from '@/components/LiveStats';
import ActivityFeed from '@/components/ActivityFeed';

export default function Home() {
  const { ready, authenticated, user, login, logout } = usePrivy();
  const [showRegister, setShowRegister] = useState(false);

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (!ready) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-black">
        <LoadingDots size={120} />
        <p className="text-xl text-gray-400 mt-4 animate-pulse">Loading SolSkill...</p>
      </div>
    );
  }

  return (
    <AnimatedGradient className="min-h-screen bg-black text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute w-96 h-96 bg-[#14F195]/5 rounded-full blur-3xl"
          style={{ transform: `translate(${100 + scrollY * 0.1}px, ${100 - scrollY * 0.05}px)` }}
        />
        <div 
          className="absolute right-0 w-96 h-96 bg-[#9945FF]/5 rounded-full blur-3xl"
          style={{ transform: `translate(${-scrollY * 0.1}px, ${200 + scrollY * 0.05}px)` }}
        />
      </div>

      <PriceTicker />
      
      <div className="relative container mx-auto px-4 py-8">
        {/* Navigation */}
        <nav className="flex justify-between items-center mb-16 relative z-10">
          <NavLogo />
          
          <div className="flex items-center gap-4">
            <a 
              href="/skill.md" 
              target="_blank"
              className="flex items-center gap-2 text-gray-400 hover:text-[#14F195] transition text-sm"
            >
              <DocumentIcon size={20} />
              Skill File
            </a>
            {authenticated ? (
              <>
                <a
                  href="/dashboard"
                  className="px-4 py-2 bg-[#14F195]/20 hover:bg-[#14F195]/30 rounded-lg transition border border-[#14F195]/30 text-[#14F195]"
                >
                  Dashboard
                </a>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition border border-gray-700"
                >
                  Logout
                </button>
              </>
            ) : (
              <button
                onClick={login}
                className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition border border-gray-700"
              >
                Login
              </button>
            )}
          </div>
        </nav>

        {/* Hero Section */}
        <section className="relative py-12 lg:py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#14F195]/10 border border-[#14F195]/30 rounded-full text-sm text-[#14F195]">
                <span className="w-2 h-2 bg-[#14F195] rounded-full animate-pulse" />
                Built for the Solana AI Hackathon
              </div>
              
              <h1 className="text-5xl lg:text-7xl font-bold leading-tight">
                DeFi Skills for{' '}
                <span className="bg-gradient-to-r from-[#14F195] via-[#00FFA3] to-[#9945FF] bg-clip-text text-transparent">
                  AI Agents
                </span>
              </h1>
              
              <p className="text-xl text-gray-400 max-w-xl">
                Give any AI agent secure, self-custodial DeFi powers on Solana.
                Jupiter swaps, Kamino lending & vaults, Raydium pools — all through a simple API.
              </p>

              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => authenticated ? setShowRegister(true) : login()}
                  className="group px-8 py-4 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold text-lg rounded-xl transition transform hover:scale-105 shadow-xl shadow-[#14F195]/30 flex items-center gap-3"
                >
                  {authenticated ? 'Register Agent' : 'Get Started'}
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </button>
                <a
                  href="https://github.com/caiovicentino/solskill"
                  target="_blank"
                  className="px-8 py-4 bg-gray-800/80 hover:bg-gray-700 font-bold text-lg rounded-xl transition border border-gray-700 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
                  GitHub
                </a>
              </div>

              <div className="flex gap-8 pt-8 border-t border-gray-800">
                <div>
                  <div className="text-3xl font-bold text-[#14F195]">4+</div>
                  <div className="text-gray-500 text-sm">DeFi Protocols</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#14F195]">15+</div>
                  <div className="text-gray-500 text-sm">API Endpoints</div>
                </div>
                <div>
                  <div className="text-3xl font-bold text-[#14F195]">∞</div>
                  <div className="text-gray-500 text-sm">Possibilities</div>
                </div>
              </div>
            </div>

            <div className="relative flex justify-center">
              <FloatingWrapper duration={6}>
                <HeroRobotInteractive size={420} />
              </FloatingWrapper>
            </div>
          </div>
        </section>

        {/* Registration Modal/Section */}
        {showRegister && (
          <section className="py-12" id="register">
            <div className="max-w-2xl mx-auto">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold">Register Your Agent</h2>
                <button 
                  onClick={() => setShowRegister(false)}
                  className="text-gray-500 hover:text-white transition"
                >
                  ✕ Close
                </button>
              </div>
              <RegisterFlow />
            </div>
          </section>
        )}

        {/* Live Demo Section */}
        <section className="py-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-4xl font-bold mb-4">Try It Live</h2>
              <p className="text-gray-400 mb-6">
                This is a real swap quote from Jupiter Ultra API. No mock data.
                Your agents get the same real-time access to Solana DeFi.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="w-8 h-8 rounded-full bg-[#14F195]/20 flex items-center justify-center text-[#14F195]">1</span>
                  <span>Agent calls GET /api/v1/jupiter/quote</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="w-8 h-8 rounded-full bg-[#14F195]/20 flex items-center justify-center text-[#14F195]">2</span>
                  <span>SolSkill queries Jupiter Ultra API</span>
                </div>
                <div className="flex items-center gap-3 text-gray-300">
                  <span className="w-8 h-8 rounded-full bg-[#14F195]/20 flex items-center justify-center text-[#14F195]">3</span>
                  <span>Returns best route with real prices</span>
                </div>
              </div>
              <div className="mt-8 bg-black/50 rounded-xl p-4 border border-gray-800">
                <code className="text-sm text-gray-400">
                  <span className="text-[#14F195]">curl</span> {'"'}https://solskill.ai/api/v1/jupiter/quote?<br/>
                  &nbsp;&nbsp;inputMint=So111...&amp;outputMint=EPjF...&amp;amount=1000000000{'"'}
                </code>
              </div>
            </div>
            <LiveSwapDemo />
          </div>
        </section>

        {/* Live Stats Section */}
        <section className="py-12">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Live Platform Stats</h2>
            <p className="text-gray-400 text-sm">Real-time data from SolSkill network</p>
          </div>
          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <LiveStats />
            </div>
            <div>
              <ActivityFeed maxItems={5} />
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Why SolSkill?</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              The infrastructure AI agents need to participate in DeFi autonomously and securely.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<AnimatedIcon name="shield" size={80} />}
              title="Self-Custodial"
              description="Privy embedded wallets. Your keys, your crypto. Agents never have direct access to private keys."
              color="#14F195"
            />
            <FeatureCard
              icon={<AnimatedIcon name="robot" size={80} />}
              title="Agent-Native"
              description="Skills designed for AI agents. Simple REST API with clear documentation. Copy-paste ready."
              color="#9945FF"
            />
            <FeatureCard
              icon={<AnimatedIcon name="rocket" size={80} />}
              title="Solana Speed"
              description="Sub-second transactions. Minimal fees. Jupiter, Kamino, Raydium — the best of Solana DeFi."
              color="#00FFA3"
            />
          </div>
        </section>

        {/* Skills Section */}
        <section className="py-20">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Available Skills</h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Each skill is a set of API endpoints your agent can call. More skills coming soon!
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <SkillCard
              icon={<SwapIcon size={40} />}
              name="Jupiter Swap"
              desc="Swap any token on Solana with the best routes and prices"
              status="live"
            />
            <SkillCard
              icon={<BankIcon size={40} />}
              name="Kamino Lending"
              desc="Deposit collateral, borrow assets, manage positions"
              status="live"
            />
            <SkillCard
              icon={<ChartIcon size={40} />}
              name="Kamino Vaults"
              desc="Automated yield strategies with one-click deposit"
              status="live"
            />
            <SkillCard
              icon={<WaterIcon size={40} />}
              name="Raydium Pools"
              desc="Add/remove liquidity from AMM pools"
              status="live"
            />
            <SkillCard
              icon={<WalletIcon size={40} />}
              name="Wallet"
              desc="Check balances, send/receive SOL and tokens"
              status="live"
            />
            <SkillCard
              icon={<PortfolioIcon size={40} />}
              name="Portfolio"
              desc="Track all positions across protocols"
              status="live"
            />
            <SkillCard
              icon={<TargetIcon size={40} />}
              name="Limit Orders"
              desc="Set buy/sell orders at specific prices"
              status="live"
            />
            <SkillCard
              icon={<BellIcon size={40} />}
              name="Alerts"
              desc="Get notified on price movements"
              status="live"
            />
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20">
          <div className="relative bg-gradient-to-br from-gray-900 to-black rounded-3xl p-12 border border-gray-800 overflow-hidden">
            <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
            <div className="relative text-center">
              <h2 className="text-4xl font-bold mb-4">Ready to Empower Your Agent?</h2>
              <p className="text-gray-400 mb-8 max-w-xl mx-auto">
                Register your AI agent in minutes. Verify with a tweet. Get your API key.
              </p>
              <button
                onClick={() => setShowRegister(true)}
                className="px-10 py-5 bg-gradient-to-r from-[#14F195] to-[#9945FF] hover:opacity-90 text-black font-bold text-xl rounded-2xl transition transform hover:scale-105 shadow-2xl shadow-[#14F195]/30 inline-flex items-center gap-3"
              >
                <RocketIcon size={32} />
                Register Your Agent
              </button>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="py-12 border-t border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <AnimatedLogo size="sm" animated={false} />
            <div className="flex gap-6 text-gray-500">
              <a href="https://x.com/SolSkill_" target="_blank" className="hover:text-[#14F195] transition">
                𝕏 Twitter
              </a>
              <a href="https://github.com/caiovicentino/solskill" target="_blank" className="hover:text-[#14F195] transition">
                GitHub
              </a>
              <a href="/skill.md" target="_blank" className="hover:text-[#14F195] transition">
                Skill File
              </a>
            </div>
            <div className="text-gray-600 text-sm">
              Built for Solana AI Hackathon 2026
            </div>
          </div>
        </footer>
      </div>
    </AnimatedGradient>
  );
}

function FeatureCard({ 
  icon, 
  title, 
  description,
  color,
}: { 
  icon: React.ReactNode; 
  title: string; 
  description: string;
  color: string;
}) {
  return (
    <div className="group relative bg-gray-900/50 backdrop-blur-sm rounded-2xl p-8 border border-gray-800 hover:border-gray-700 transition-all duration-300 hover:transform hover:scale-105">
      <div 
        className="absolute inset-0 rounded-2xl transition-all duration-300 opacity-0 group-hover:opacity-100"
        style={{ 
          background: `radial-gradient(circle at top left, ${color}10 0%, transparent 50%)`,
        }}
      />
      <div className="relative">
        <div className="flex justify-center mb-6">{icon}</div>
        <h3 className="text-xl font-bold mb-3 text-center">{title}</h3>
        <p className="text-gray-400 text-center">{description}</p>
      </div>
    </div>
  );
}

function SkillCard({ 
  icon, 
  name, 
  desc, 
  status,
}: { 
  icon: React.ReactNode; 
  name: string; 
  desc: string; 
  status: 'live' | 'soon';
}) {
  return (
    <div className="group bg-gray-900/50 backdrop-blur-sm rounded-xl p-6 border border-gray-800 hover:border-[#14F195]/50 transition-all duration-300">
      <div className="flex items-center gap-3 mb-3">
        {icon}
        <div className="flex-1">
          <span className="font-bold">{name}</span>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full ${
          status === 'live' 
            ? 'bg-[#14F195]/20 text-[#14F195]' 
            : 'bg-gray-800 text-gray-400'
        }`}>
          {status === 'live' ? '✓ Live' : 'Soon'}
        </span>
      </div>
      <p className="text-gray-400 text-sm">{desc}</p>
    </div>
  );
}
