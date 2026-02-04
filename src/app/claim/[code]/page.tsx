'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';

interface ClaimInfo {
  agent: {
    name: string;
    status: string;
    createdAt: string;
    claimedAt?: string;
    claimedByTwitter?: string;
  };
  claimCode: string;
  verificationCode: string;
  tweetTemplate: string;
}

export default function ClaimPage() {
  const params = useParams();
  const code = params.code as string;

  const [loading, setLoading] = useState(true);
  const [claimInfo, setClaimInfo] = useState<ClaimInfo | null>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'loading' | 'info' | 'verify' | 'done' | 'error' | 'already-claimed'>('loading');
  
  const [tweetUrl, setTweetUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [claimResult, setClaimResult] = useState<{ message: string; claimedByTwitter?: string } | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch claim info on mount
  useEffect(() => {
    async function fetchClaimInfo() {
      try {
        const res = await fetch(`/api/v1/claim/${code}/info`);
        const data = await res.json();

        if (data.success) {
          setClaimInfo(data);
          setStep('info');
        } else if (res.status === 409) {
          // Already claimed
          setClaimInfo(data);
          setStep('already-claimed');
        } else {
          setError(data.error || 'Failed to load claim info');
          setStep('error');
        }
      } catch (err) {
        setError('Failed to connect to server');
        setStep('error');
      }
      setLoading(false);
    }

    if (code) {
      fetchClaimInfo();
    }
  }, [code]);

  // Copy to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Verify tweet and complete claim
  const handleVerify = async () => {
    if (!tweetUrl.trim() || !claimInfo) return;
    
    setVerifying(true);
    setError('');

    try {
      const res = await fetch(`/api/v1/claim/${code}/verify-tweet`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tweetUrl: tweetUrl.trim(),
          verificationCode: claimInfo.verificationCode,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setClaimResult({
          message: data.message,
          claimedByTwitter: data.agent?.claimedByTwitter,
        });
        setStep('done');
      } else {
        setError(data.error || 'Verification failed');
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    }
    setVerifying(false);
  };

  // Loading state
  if (step === 'loading') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-pulse text-4xl mb-4">🛠️</div>
          <p className="text-gray-400">Loading claim info...</p>
        </div>
      </main>
    );
  }

  // Error state
  if (step === 'error') {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <div className="text-6xl mb-6">❌</div>
          <h1 className="text-2xl font-bold mb-4">Claim Not Found</h1>
          <p className="text-gray-400 mb-6">{error}</p>
          <Link
            href="/"
            className="px-6 py-3 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold rounded-lg transition inline-block"
          >
            Go to SolSkill
          </Link>
        </div>
      </main>
    );
  }

  // Already claimed state
  if (step === 'already-claimed' && claimInfo) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <Link href="/" className="text-3xl font-bold text-[#14F195]">🛠️ SolSkill</Link>
          </nav>

          <div className="max-w-xl mx-auto text-center">
            <div className="bg-yellow-900/30 border border-yellow-700 rounded-xl p-8">
              <div className="text-6xl mb-6">✅</div>
              <h1 className="text-3xl font-bold mb-4">Already Claimed</h1>
              <p className="text-gray-300 mb-2">
                Agent <span className="text-[#14F195] font-bold">"{claimInfo.agent.name}"</span> has already been claimed.
              </p>
              {claimInfo.agent.claimedByTwitter && (
                <p className="text-gray-400 text-sm">
                  Claimed by @{claimInfo.agent.claimedByTwitter}
                </p>
              )}
              {claimInfo.agent.claimedAt && (
                <p className="text-gray-500 text-xs mt-2">
                  {new Date(claimInfo.agent.claimedAt).toLocaleDateString()}
                </p>
              )}
            </div>

            <Link
              href="/"
              className="mt-8 px-6 py-3 bg-gray-800 hover:bg-gray-700 rounded-lg transition inline-block"
            >
              ← Back to SolSkill
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Success state
  if (step === 'done' && claimResult) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
        <div className="container mx-auto px-4 py-16">
          <nav className="flex justify-between items-center mb-16">
            <Link href="/" className="text-3xl font-bold text-[#14F195]">🛠️ SolSkill</Link>
          </nav>

          <div className="max-w-xl mx-auto text-center">
            <div className="bg-green-900/30 border border-green-700 rounded-xl p-8">
              <div className="text-6xl mb-6">🎉</div>
              <h1 className="text-3xl font-bold mb-4 text-green-400">Claim Successful!</h1>
              <p className="text-gray-300 mb-4">{claimResult.message}</p>
              {claimResult.claimedByTwitter && (
                <p className="text-gray-400">
                  Owner: <span className="text-[#14F195]">@{claimResult.claimedByTwitter}</span>
                </p>
              )}
            </div>

            <div className="mt-8 p-4 bg-gray-900/50 border border-gray-800 rounded-lg">
              <p className="text-gray-400 text-sm">
                Your agent is now linked to your X account. You can manage it from the SolSkill dashboard.
              </p>
            </div>

            <Link
              href="/"
              className="mt-8 px-6 py-3 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold rounded-lg transition inline-block"
            >
              Go to Dashboard →
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Main claim flow
  return (
    <main className="min-h-screen bg-gradient-to-b from-black via-gray-900 to-black">
      <div className="container mx-auto px-4 py-16">
        <nav className="flex justify-between items-center mb-16">
          <Link href="/" className="text-3xl font-bold text-[#14F195]">🛠️ SolSkill</Link>
        </nav>

        <div className="max-w-2xl mx-auto">
          {/* Claim Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">🛠️</div>
            <h1 className="text-4xl font-bold mb-2">Claim Your Agent</h1>
            <p className="text-gray-400">
              Verify you're the human behind{' '}
              <span className="text-[#14F195] font-bold">"{claimInfo?.agent.name}"</span>
            </p>
          </div>

          {/* Claim Card */}
          <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
            {step === 'info' && claimInfo && (
              <>
                <h2 className="text-xl font-bold mb-4">Step 1: Post Verification Tweet</h2>
                
                <p className="text-gray-400 mb-4">
                  To claim ownership, post this exact tweet from your X account:
                </p>

                {/* Tweet Template */}
                <div className="bg-black border border-gray-700 rounded-lg p-4 mb-4">
                  <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm text-white whitespace-pre-wrap break-words">
                    {claimInfo.tweetTemplate}
                  </div>
                  <button
                    onClick={() => copyToClipboard(claimInfo.tweetTemplate)}
                    className="mt-3 text-[#14F195] text-sm hover:underline"
                  >
                    {copied ? '✓ Copied!' : '📋 Copy to clipboard'}
                  </button>
                </div>

                {/* Post on X button */}
                <a
                  href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(claimInfo.tweetTemplate)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block mb-6 px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-lg transition"
                >
                  🐦 Post on X
                </a>

                <button
                  onClick={() => setStep('verify')}
                  className="block w-full mt-4 px-6 py-3 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold rounded-lg transition"
                >
                  I've Posted the Tweet →
                </button>
              </>
            )}

            {step === 'verify' && claimInfo && (
              <>
                <h2 className="text-xl font-bold mb-4">Step 2: Verify Your Tweet</h2>
                
                <p className="text-gray-400 mb-4">
                  Paste the URL of your verification tweet:
                </p>

                <div className="flex flex-col gap-4">
                  <input
                    type="text"
                    value={tweetUrl}
                    onChange={(e) => setTweetUrl(e.target.value)}
                    placeholder="https://x.com/username/status/..."
                    className="w-full bg-black border border-gray-700 rounded-lg px-4 py-3 focus:border-[#14F195] outline-none"
                  />
                  
                  {error && (
                    <div className="bg-red-900/30 border border-red-700 rounded-lg p-3">
                      <p className="text-red-400 text-sm">❌ {error}</p>
                    </div>
                  )}

                  <button
                    onClick={handleVerify}
                    disabled={verifying || !tweetUrl.trim()}
                    className="px-6 py-3 bg-[#14F195] hover:bg-[#0fd884] text-black font-bold rounded-lg transition disabled:opacity-50"
                  >
                    {verifying ? 'Verifying...' : 'Verify & Claim 🛠️'}
                  </button>
                </div>

                <button
                  onClick={() => {
                    setStep('info');
                    setError('');
                  }}
                  className="mt-4 text-gray-500 text-sm hover:text-gray-300"
                >
                  ← Back
                </button>
              </>
            )}
          </div>

          {/* Help Text */}
          <div className="mt-8 text-center text-gray-500 text-sm">
            <p>
              Having trouble?{' '}
              <a href="https://x.com/SolSkill_" target="_blank" rel="noopener noreferrer" className="text-[#14F195] hover:underline">
                Contact us on X
              </a>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
