'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState, useEffect } from 'react';
import {
  SecurityShield,
  TradingChart,
  RocketSpeed,
  SuccessCheck,
  LoadingDots,
  Confetti,
  FloatingWrapper,
  GlowWrapper,
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
  WaveIcon,
  PortfolioIcon,
} from '@/components/AnimatedIcons';

export default function Home() {
  const { ready, authenticated, user, login, logout, linkTwitter } = usePrivy();
  const [step, setStep] = useState<'start' | 'link-twitter' | 'verify' | 'done'>('start');
  const [agentName, setAgentName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [scrollY, setScrollY] = useState(0);
  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const hasTwitter = !!user?.twitter?.username;

  const startRegistration = () => {
    if (!agentName.trim()) return;
    if (!hasTwitter) {
      setStep('link-twitter');
      return;
    }
    const code = crypto.randomUUID().substring(0, 8).toUpperCase();
    setVerificationCode(code);
    setStep('verify');
    setError('');
  };

  const handleLinkTwitter = async () => {
    try {
      await linkTwitter();
      const code = crypto.randomUUID().substring(0, 8).toUpperCase();
      setVerificationCode(code);
      setStep('verify');
    } catch {
      setError('Failed to link Twitter. Please try again.');
    }
  };

  const getTweetText = () => {
    const handle = user?.twitter?.username ? `@${user.twitter.username}` : 'I';
    return `${handle} am registering my AI agent "${agentName}" on @SolSkill_\n\n🛠️ Verification: ${verificationCode}\n\nhttps://solskill.ai`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const verifyAndRegister = async () => {
    if (!tweetUrl.trim()) return;
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/v1/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName,
          wallet: user?.wallet?.address || 'embedded',
          userId: user?.id,
          twitterUsername: user?.twitter?.username,
          tweetUrl: tweetUrl.trim(),
          verificationCode,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setApiKey(data.agent.apiKey);
        setStep('done');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      } else {
        setError(data.error || 'Verification failed. Make sure you posted the exact text.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setVerifying(false);
  };

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
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <Confetti size={600} />
        </div>
      )}

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
              <button
                onClick={logout}
                className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700 rounded-lg transition border border-gray-700"
              >
                Logout
              </button>
            ) : (
              <button
                onClick={login}
                className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold rounded-xl transition transform hover:scale-105 shadow-lg shadow-[#14F195]/20"
              >
                Connect
              </button>
            )}
          </div>
        </nav>

        {!authenticated ? (
          <>
            {/* Hero Section */}
            <section className="relative py-20">
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
                      onClick={login}
                      className="group px-8 py-4 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold text-lg rounded-xl transition transform hover:scale-105 shadow-xl shadow-[#14F195]/30 flex items-center gap-3"
                    >
                      Get Started
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
                    Register your AI agent in minutes. Get an API key. Start trading.
                  </p>
                  <button
                    onClick={login}
                    className="px-10 py-5 bg-gradient-to-r from-[#14F195] to-[#9945FF] hover:opacity-90 text-black font-bold text-xl rounded-2xl transition transform hover:scale-105 shadow-2xl shadow-[#14F195]/30 inline-flex items-center gap-3"
                  >
                    <RocketIcon size={32} />
                    Launch Your Agent
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
          </>
        ) : (
          <DashboardView
            user={user}
            step={step}
            setStep={setStep}
            agentName={agentName}
            setAgentName={setAgentName}
            verificationCode={verificationCode}
            tweetUrl={tweetUrl}
            setTweetUrl={setTweetUrl}
            verifying={verifying}
            apiKey={apiKey}
            error={error}
            copied={copied}
            hasTwitter={hasTwitter}
            startRegistration={startRegistration}
            handleLinkTwitter={handleLinkTwitter}
            getTweetText={getTweetText}
            copyToClipboard={copyToClipboard}
            verifyAndRegister={verifyAndRegister}
          />
        )}
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

function DashboardView({
  user,
  step,
  setStep,
  agentName,
  setAgentName,
  verificationCode,
  tweetUrl,
  setTweetUrl,
  verifying,
  apiKey,
  error,
  copied,
  hasTwitter,
  startRegistration,
  handleLinkTwitter,
  getTweetText,
  copyToClipboard,
  verifyAndRegister,
}: {
  user: any;
  step: 'start' | 'link-twitter' | 'verify' | 'done';
  setStep: (s: 'start' | 'link-twitter' | 'verify' | 'done') => void;
  agentName: string;
  setAgentName: (s: string) => void;
  verificationCode: string;
  tweetUrl: string;
  setTweetUrl: (s: string) => void;
  verifying: boolean;
  apiKey: string;
  error: string;
  copied: boolean;
  hasTwitter: boolean;
  startRegistration: () => void;
  handleLinkTwitter: () => void;
  getTweetText: () => string;
  copyToClipboard: (text: string) => void;
  verifyAndRegister: () => void;
}) {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8 mb-8">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center overflow-hidden">
            <WaveIcon size={64} />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              Welcome, {user?.email?.address?.split('@')[0] || 'Agent Owner'}
            </h2>
            {user?.twitter?.username && (
              <p className="text-gray-400">
                <span className="text-[#1DA1F2]">@{user.twitter.username}</span> connected
              </p>
            )}
          </div>
        </div>

        {user?.wallet?.address && (
          <div className="bg-black/50 rounded-xl p-4 mb-6 border border-gray-800">
            <p className="text-gray-400 text-xs mb-1">Your Embedded Wallet</p>
            <code className="text-[#14F195] text-sm break-all">{user.wallet.address}</code>
          </div>
        )}

        {step === 'start' && (
          <div className="border-t border-gray-800 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <AnimatedIcon name="robot" size={32} />
              <h3 className="text-xl font-bold">Register Your Agent</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Verify ownership with a tweet, then get your API key.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Agent name (e.g., Major, Claude, Devin)"
                className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-[#14F195] outline-none transition"
                maxLength={50}
              />
              <button
                onClick={startRegistration}
                disabled={!agentName.trim()}
                className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold rounded-xl transition disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 'link-twitter' && (
          <div className="border-t border-gray-800 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <AnimatedIcon name="twitter" size={32} />
              <h3 className="text-xl font-bold">Link Your X Account</h3>
            </div>
            <p className="text-gray-400 mb-6">
              We verify agent ownership through X (Twitter). This ensures humans control their agents.
            </p>
            <button
              onClick={handleLinkTwitter}
              className="px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-xl transition flex items-center gap-2"
            >
              <AnimatedIcon name="lock" size={20} />
              Link X Account
            </button>
            {error && <p className="text-red-400 text-sm mt-4">❌ {error}</p>}
            <button onClick={() => setStep('start')} className="mt-4 block text-gray-500 text-sm hover:text-gray-300">
              ← Back
            </button>
          </div>
        )}

        {step === 'verify' && (
          <div className="border-t border-gray-800 pt-6">
            <div className="flex items-center gap-3 mb-4">
              <AnimatedIcon name="notification" size={32} />
              <h3 className="text-xl font-bold">Post Verification Tweet</h3>
            </div>
            
            <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
              <span className="text-[#14F195]">✓ Name</span>
              <span>→</span>
              <span className="text-[#14F195]">Tweet</span>
              <span>→</span>
              <span>Verify</span>
            </div>

            <div className="bg-black border border-gray-700 rounded-xl p-4 mb-4">
              <p className="text-gray-300 text-sm mb-2">Copy and post this exact text on X:</p>
              <div className="bg-gray-900/50 p-4 rounded-lg font-mono text-sm text-white whitespace-pre-wrap break-words border border-gray-800">
                {getTweetText()}
              </div>
              <button
                onClick={() => copyToClipboard(getTweetText())}
                className="mt-3 text-[#14F195] text-sm hover:underline"
              >
                {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
              </button>
            </div>

            <a
              href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(getTweetText())}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mb-6 px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-xl transition"
            >
              <AnimatedIcon name="twitter" size={24} />
              Post on X
            </a>

            <div className="border-t border-gray-800 pt-4">
              <p className="text-gray-400 mb-2">After posting, paste your tweet URL:</p>
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={tweetUrl}
                  onChange={(e) => setTweetUrl(e.target.value)}
                  placeholder="https://x.com/username/status/..."
                  className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-[#14F195] outline-none transition"
                />
                <button
                  onClick={verifyAndRegister}
                  disabled={verifying || !tweetUrl.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold rounded-xl transition disabled:opacity-50 flex items-center gap-2"
                >
                  {verifying ? (
                    <>
                      <LoadingDots size={20} />
                      Verifying...
                    </>
                  ) : (
                    <>
                      <AnimatedIcon name="check" size={20} loop={false} />
                      Verify
                    </>
                  )}
                </button>
              </div>
              {error && <p className="text-red-400 text-sm mt-2">❌ {error}</p>}
            </div>

            <button onClick={() => setStep('start')} className="mt-4 text-gray-500 text-sm hover:text-gray-300">
              ← Back
            </button>
          </div>
        )}

        {step === 'done' && (
          <div className="bg-gradient-to-br from-[#14F195]/10 to-[#9945FF]/10 border border-[#14F195]/30 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <SuccessCheck size={60} />
              <p className="text-[#14F195] font-bold text-xl">Agent "{agentName}" Registered!</p>
            </div>

            <div className="mb-4">
              <p className="text-gray-300 text-sm mb-2">Your API Key:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-black p-4 rounded-xl text-[#14F195] break-all text-sm font-mono border border-gray-800">
                  {apiKey}
                </code>
                <button
                  onClick={() => copyToClipboard(apiKey)}
                  className="px-4 py-4 bg-gray-800 hover:bg-gray-700 rounded-xl transition"
                >
                  {copied ? '✓' : '📋'}
                </button>
              </div>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-xl p-4 mb-4 flex items-center gap-3">
              <AnimatedIcon name="bell" size={24} />
              <p className="text-yellow-400 text-sm">
                <strong>Save this API key now!</strong> It cannot be recovered if lost.
              </p>
            </div>

            <p className="text-gray-400 text-sm flex items-center gap-2">
              <DocumentIcon size={20} />
              Send your agent the skill file:{' '}
              <code className="bg-black/50 px-2 py-1 rounded text-[#14F195]">
                https://solskill.ai/skill.md
              </code>
            </p>
          </div>
        )}
      </div>

      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-6">
          <AnimatedIcon name="tool" size={32} />
          <h3 className="text-xl font-bold">Available Skills</h3>
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <SkillCardMini icon={<SwapIcon size={28} />} name="Jupiter Swap" endpoint="/api/v1/jupiter/quote" />
          <SkillCardMini icon={<BankIcon size={28} />} name="Kamino Lending" endpoint="/api/v1/kamino/reserves" />
          <SkillCardMini icon={<ChartIcon size={28} />} name="Kamino Vaults" endpoint="/api/v1/kamino/vaults" />
          <SkillCardMini icon={<WaterIcon size={28} />} name="Raydium Pools" endpoint="/api/v1/raydium/pools" />
          <SkillCardMini icon={<WalletIcon size={28} />} name="Wallet Balance" endpoint="/api/v1/wallet/balance" />
          <SkillCardMini icon={<AnimatedIcon name="exchange" size={28} />} name="Send Tokens" endpoint="/api/v1/wallet/send" />
        </div>

        <div className="mt-6 p-4 bg-[#14F195]/10 border border-[#14F195]/30 rounded-xl flex items-center gap-3">
          <DocumentIcon size={24} />
          <p className="text-sm">
            <span className="font-bold text-[#14F195]">Full Documentation:</span>{' '}
            <code className="bg-black/50 px-2 py-1 rounded">https://solskill.ai/skill.md</code>
          </p>
        </div>
      </div>
    </div>
  );
}

function SkillCardMini({ icon, name, endpoint }: { icon: React.ReactNode; name: string; endpoint: string }) {
  return (
    <div className="bg-black/50 rounded-xl p-4 border border-gray-800 hover:border-gray-700 transition flex items-center gap-3">
      {icon}
      <div>
        <span className="font-bold block">{name}</span>
        <code className="text-xs text-[#14F195]">{endpoint}</code>
      </div>
    </div>
  );
}
