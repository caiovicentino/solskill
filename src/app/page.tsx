'use client';

import { usePrivy } from '@privy-io/react-auth';
import { useState } from 'react';

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

  // Check if user has Twitter linked
  const hasTwitter = !!user?.twitter?.username;

  // Generate verification code when user starts registration
  const startRegistration = () => {
    if (!agentName.trim()) return;
    
    // If no Twitter, prompt to link
    if (!hasTwitter) {
      setStep('link-twitter');
      return;
    }
    
    // Generate secure code
    const code = crypto.randomUUID().substring(0, 8).toUpperCase();
    setVerificationCode(code);
    setStep('verify');
    setError('');
  };

  // Handle Twitter linking
  const handleLinkTwitter = async () => {
    try {
      await linkTwitter();
      // After linking, generate code and proceed
      const code = crypto.randomUUID().substring(0, 8).toUpperCase();
      setVerificationCode(code);
      setStep('verify');
    } catch (err) {
      setError('Failed to link Twitter. Please try again.');
    }
  };

  // The tweet text user needs to post
  const getTweetText = () => {
    const handle = user?.twitter?.username ? `@${user.twitter.username}` : 'I';
    return `${handle} am registering my AI agent "${agentName}" on @ClawFi_\n\n🦞 Verification: ${verificationCode}\n\nhttps://clawfi.xyz`;
  };

  // Copy to clipboard with feedback
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verify the tweet and complete registration
  const verifyAndRegister = async () => {
    if (!tweetUrl.trim()) return;
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/agents/register', {
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
      } else {
        setError(data.error || 'Verification failed. Make sure you posted the exact text.');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.error(err);
    }
    setVerifying(false);
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-pulse text-2xl">🦞 Loading ClawFi...</div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <h1 className="text-3xl font-bold text-[#14F195]">🦞 ClawFi</h1>
          {authenticated ? (
            <button
              onClick={logout}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition"
            >
              Logout
            </button>
          ) : (
            <button
              onClick={login}
              className="px-6 py-3 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold rounded-lg transition"
            >
              Connect
            </button>
          )}
        </nav>

        {!authenticated ? (
          <div className="text-center py-20">
            <h2 className="text-5xl font-bold mb-6">
              DeFi Skills for <span className="text-[#14F195]">AI Agents</span>
            </h2>
            <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
              Give any AI agent secure, self-custodial DeFi powers on Solana.
              Jupiter swaps, Kamino lending & vaults.
            </p>
            <button
              onClick={login}
              className="px-8 py-4 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold text-lg rounded-xl transition transform hover:scale-105"
            >
              🚀 Get Started
            </button>

            <div className="grid md:grid-cols-3 gap-8 mt-20">
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="text-4xl mb-4">🔐</div>
                <h3 className="text-xl font-bold mb-2">Self-Custodial</h3>
                <p className="text-gray-400">Privy embedded wallets. Your keys, your crypto.</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="text-4xl mb-4">🤖</div>
                <h3 className="text-xl font-bold mb-2">Agent-Native</h3>
                <p className="text-gray-400">Skills designed for AI agents. Simple API, powerful actions.</p>
              </div>
              <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold mb-2">Solana Speed</h3>
                <p className="text-gray-400">Jupiter swaps, Kamino vaults. Fast, cheap, reliable.</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-4xl mx-auto">
            {/* User Info */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8 mb-8">
              <h2 className="text-2xl font-bold mb-4">
                👋 Welcome, {user?.twitter?.username ? `@${user.twitter.username}` : user?.email?.address || 'Agent Owner'}
              </h2>
              
              {user?.wallet?.address && (
                <div className="bg-black/50 rounded-lg p-3 mb-4">
                  <p className="text-gray-400 text-xs mb-1">Your Wallet</p>
                  <code className="text-[#14F195] text-sm break-all">{user.wallet.address}</code>
                </div>
              )}

              {/* Step: Start */}
              {step === 'start' && (
                <div className="border-t border-gray-800 pt-6">
                  <h3 className="text-xl font-bold mb-4">Register Your Agent</h3>
                  <p className="text-gray-400 mb-4">
                    To verify ownership, you'll need to post a verification tweet from your X account.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4">
                    <input
                      type="text"
                      value={agentName}
                      onChange={(e) => setAgentName(e.target.value)}
                      placeholder="Agent name (e.g., Major, Claude, Devin)"
                      className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 focus:border-[#14F195] outline-none"
                      maxLength={50}
                    />
                    <button
                      onClick={startRegistration}
                      disabled={!agentName.trim()}
                      className="px-6 py-3 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold rounded-lg transition disabled:opacity-50"
                    >
                      Continue →
                    </button>
                  </div>
                </div>
              )}

              {/* Step: Link Twitter */}
              {step === 'link-twitter' && (
                <div className="border-t border-gray-800 pt-6">
                  <h3 className="text-xl font-bold mb-4">🐦 Link Your X Account</h3>
                  <p className="text-gray-400 mb-4">
                    To verify agent ownership, you need to link your X (Twitter) account first.
                    This ensures only you can register agents under your identity.
                  </p>
                  
                  <button
                    onClick={handleLinkTwitter}
                    className="px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-lg transition"
                  >
                    🔗 Link X Account
                  </button>

                  {error && (
                    <p className="text-red-400 text-sm mt-4">❌ {error}</p>
                  )}

                  <button
                    onClick={() => setStep('start')}
                    className="mt-4 block text-gray-500 text-sm hover:text-gray-300"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Step: Verify */}
              {step === 'verify' && (
                <div className="border-t border-gray-800 pt-6">
                  <h3 className="text-xl font-bold mb-4">📢 Post Verification Tweet</h3>
                  
                  {/* Progress indicator */}
                  <div className="flex items-center gap-2 mb-6 text-sm text-gray-400">
                    <span className="text-[#14F195]">✓ Name</span>
                    <span>→</span>
                    <span className="text-[#14F195]">Tweet</span>
                    <span>→</span>
                    <span>Verify</span>
                  </div>
                  
                  <div className="bg-black border border-gray-700 rounded-lg p-4 mb-4">
                    <p className="text-gray-300 text-sm mb-2">Copy and post this exact text on X:</p>
                    <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-white whitespace-pre-wrap break-words">
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
                    className="inline-block mb-6 px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-lg transition"
                  >
                    🐦 Post on X
                  </a>

                  <div className="border-t border-gray-800 pt-4 mt-4">
                    <p className="text-gray-400 mb-2">After posting, paste your tweet URL here:</p>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <input
                        type="text"
                        value={tweetUrl}
                        onChange={(e) => setTweetUrl(e.target.value)}
                        placeholder="https://x.com/username/status/..."
                        className="flex-1 bg-black border border-gray-700 rounded-lg px-4 py-3 focus:border-[#14F195] outline-none"
                      />
                      <button
                        onClick={verifyAndRegister}
                        disabled={verifying || !tweetUrl.trim()}
                        className="px-6 py-3 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold rounded-lg transition disabled:opacity-50"
                      >
                        {verifying ? 'Verifying...' : 'Verify ✓'}
                      </button>
                    </div>
                    {error && (
                      <p className="text-red-400 text-sm mt-2">❌ {error}</p>
                    )}
                  </div>

                  <button
                    onClick={() => setStep('start')}
                    className="mt-4 text-gray-500 text-sm hover:text-gray-300"
                  >
                    ← Back
                  </button>
                </div>
              )}

              {/* Step: Done */}
              {step === 'done' && (
                <div className="bg-green-900/30 border border-green-700 rounded-lg p-6">
                  <p className="text-green-400 font-bold text-xl mb-4">✅ Agent "{agentName}" Registered!</p>
                  
                  <div className="mb-4">
                    <p className="text-gray-300 text-sm mb-2">Your API Key:</p>
                    <div className="flex items-center gap-2">
                      <code className="flex-1 bg-black p-4 rounded text-[#14F195] break-all text-sm font-mono">
                        {apiKey}
                      </code>
                      <button
                        onClick={() => copyToClipboard(apiKey)}
                        className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition text-sm"
                        title="Copy API Key"
                      >
                        {copied ? '✓' : '📋'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mb-4">
                    <p className="text-yellow-400 text-sm">
                      ⚠️ <strong>Save this API key now!</strong> It cannot be recovered if lost.
                    </p>
                  </div>
                  
                  <p className="text-gray-400 text-sm">
                    📄 Send your agent the skill file:{' '}
                    <code className="bg-black/50 px-2 py-1 rounded text-[#14F195]">
                      https://clawfi.xyz/skill.md
                    </code>
                  </p>
                </div>
              )}
            </div>

            {/* Available Skills */}
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
              <h3 className="text-xl font-bold mb-6">Available Skills</h3>
              <div className="grid md:grid-cols-2 gap-4">
                <SkillCard
                  emoji="🔄"
                  name="Jupiter Swap"
                  desc="Swap any token on Solana with best routes"
                  endpoint="/api/v1/jupiter/quote"
                />
                <SkillCard
                  emoji="🏦"
                  name="Kamino Lending"
                  desc="Deposit, borrow, earn yield"
                  endpoint="/api/v1/kamino/reserves"
                />
                <SkillCard
                  emoji="📈"
                  name="Kamino Vaults"
                  desc="Automated yield strategies"
                  endpoint="/api/v1/kamino/vaults"
                />
                <SkillCard
                  emoji="👛"
                  name="Wallet Check"
                  desc="Get balances, tokens, and positions"
                  endpoint="/api/v1/wallet/balance"
                />
              </div>

              <div className="mt-6 p-4 bg-[#14F195]/10 border border-[#14F195]/30 rounded-lg">
                <p className="text-sm">
                  <span className="font-bold text-[#14F195]">📄 Skill File:</span>{' '}
                  <code className="bg-black/50 px-2 py-1 rounded">https://clawfi.xyz/skill.md</code>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function SkillCard({ emoji, name, desc, endpoint }: { emoji: string; name: string; desc: string; endpoint: string }) {
  return (
    <div className="bg-black/50 rounded-lg p-4 border border-gray-800">
      <div className="flex items-center gap-3 mb-2">
        <span className="text-2xl">{emoji}</span>
        <span className="font-bold">{name}</span>
      </div>
      <p className="text-gray-400 text-sm">{desc}</p>
      <code className="text-xs text-[#14F195] mt-2 block">{endpoint}</code>
    </div>
  );
}
