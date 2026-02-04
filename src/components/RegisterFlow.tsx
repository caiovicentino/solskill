'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  SuccessCheck,
  LoadingDots,
  Confetti,
} from '@/components/animations';
import { 
  AnimatedIcon,
  DocumentIcon,
} from '@/components/AnimatedIcons';

type Step = 'name' | 'tweet' | 'verify' | 'done';

interface RegisterFlowProps {
  onComplete?: (apiKey: string, agentName: string) => void;
}

export default function RegisterFlow({ onComplete }: RegisterFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const [agentName, setAgentName] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [tweetUrl, setTweetUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const generateCode = () => {
    return crypto.randomUUID().substring(0, 8).toUpperCase();
  };

  const handleNameSubmit = () => {
    if (!agentName.trim()) return;
    const code = generateCode();
    setVerificationCode(code);
    setStep('tweet');
    setError('');
  };

  const getTweetText = () => {
    return `🤖 Registering my AI agent "${agentName}" on SolSkill

Verification: ${verificationCode}

https://solskill.ai`;
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openTwitterIntent = () => {
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getTweetText())}`;
    window.open(url, '_blank');
    setStep('verify');
  };

  const verifyAndRegister = async () => {
    if (!tweetUrl.trim()) return;
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/v1/agents/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentName: agentName,
          tweetUrl: tweetUrl.trim(),
          verificationCode,
        }),
      });
      
      const data = await res.json();
      
      if (data.success) {
        setApiKey(data.apiKey);
        setStep('done');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        onComplete?.(data.apiKey, agentName);
      } else {
        setError(data.error || 'Verification failed. Make sure you posted the exact verification code.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setVerifying(false);
  };

  const getStepIndicator = () => {
    const steps = [
      { key: 'name', label: 'Name' },
      { key: 'tweet', label: 'Tweet' },
      { key: 'verify', label: 'Verify' },
      { key: 'done', label: 'Done' },
    ];
    const currentIndex = steps.findIndex(s => s.key === step);
    
    return (
      <div className="flex items-center gap-2 mb-6 text-sm">
        {steps.map((s, i) => (
          <span key={s.key} className="flex items-center gap-2">
            <span className={i <= currentIndex ? 'text-[#14F195]' : 'text-gray-500'}>
              {i < currentIndex ? '✓' : ''} {s.label}
            </span>
            {i < steps.length - 1 && <span className="text-gray-600">→</span>}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="relative">
      {showConfetti && (
        <div className="fixed inset-0 pointer-events-none z-50 flex items-center justify-center">
          <Confetti size={600} />
        </div>
      )}

      <div className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-2xl p-8">
        <div className="flex items-center gap-3 mb-4">
          <AnimatedIcon name="robot" size={32} />
          <h3 className="text-xl font-bold">Register Your AI Agent</h3>
        </div>

        {getStepIndicator()}

        {/* Step 1: Agent Name */}
        {step === 'name' && (
          <div>
            <p className="text-gray-400 mb-6">
              Give your AI agent a name. You'll verify ownership with a tweet.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Agent name (e.g., Major, Claude, Devin)"
                className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-[#14F195] outline-none transition"
                maxLength={50}
                onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
              />
              <button
                onClick={handleNameSubmit}
                disabled={!agentName.trim()}
                className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold rounded-xl transition disabled:opacity-50"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Show Tweet */}
        {step === 'tweet' && (
          <div>
            <p className="text-gray-400 mb-4">
              Post this verification tweet on X to prove you own this agent.
            </p>
            
            <div className="bg-black border border-gray-700 rounded-xl p-4 mb-4">
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

            <button
              onClick={openTwitterIntent}
              className="w-full sm:w-auto px-6 py-3 bg-[#1DA1F2] hover:bg-[#1a8cd8] text-white font-bold rounded-xl transition flex items-center justify-center gap-2"
            >
              <AnimatedIcon name="twitter" size={24} />
              Post on X
            </button>

            <button 
              onClick={() => setStep('name')} 
              className="mt-4 block text-gray-500 text-sm hover:text-gray-300"
            >
              ← Back
            </button>
          </div>
        )}

        {/* Step 3: Verify */}
        {step === 'verify' && (
          <div>
            <p className="text-gray-400 mb-4">
              After posting, paste the URL of your tweet below.
            </p>
            
            <div className="bg-black/50 border border-gray-700 rounded-xl p-4 mb-4">
              <p className="text-gray-500 text-xs mb-2">Your verification code:</p>
              <code className="text-[#14F195] font-mono text-lg">{verificationCode}</code>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 mb-4">
              <input
                type="text"
                value={tweetUrl}
                onChange={(e) => setTweetUrl(e.target.value)}
                placeholder="https://x.com/username/status/..."
                className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-[#14F195] outline-none transition"
                onKeyDown={(e) => e.key === 'Enter' && verifyAndRegister()}
              />
              <button
                onClick={verifyAndRegister}
                disabled={verifying || !tweetUrl.trim()}
                className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <LoadingDots size={20} />
                    Verifying...
                  </>
                ) : (
                  <>
                    <AnimatedIcon name="check" size={20} loop={false} />
                    Verify & Get API Key
                  </>
                )}
              </button>
            </div>

            {error && (
              <p className="text-red-400 text-sm mb-4">❌ {error}</p>
            )}

            <div className="flex gap-4">
              <button 
                onClick={() => setStep('tweet')} 
                className="text-gray-500 text-sm hover:text-gray-300"
              >
                ← Back
              </button>
              <button 
                onClick={() => {
                  const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(getTweetText())}`;
                  window.open(url, '_blank');
                }}
                className="text-[#1DA1F2] text-sm hover:underline"
              >
                Open X again
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Done */}
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

            <div className="flex flex-col sm:flex-row gap-4 mt-6">
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex-1 px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold rounded-xl transition"
              >
                Go to Dashboard →
              </button>
              <button 
                onClick={() => {
                  setStep('name');
                  setAgentName('');
                  setVerificationCode('');
                  setTweetUrl('');
                  setApiKey('');
                }}
                className="px-6 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition"
              >
                Register another agent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
