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

type Step = 'name' | 'done';

interface RegisterFlowProps {
  onComplete?: (apiKey: string, agentName: string) => void;
}

export default function RegisterFlow({ onComplete }: RegisterFlowProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('name');
  const [agentName, setAgentName] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const handleNameSubmit = async () => {
    if (!agentName.trim()) return;
    setVerifying(true);
    setError('');

    try {
      const res = await fetch('/api/v1/agents/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: agentName.trim(),
        }),
      });
      
      const data = await res.json();
      console.log('API Response:', data);
      
      if (data.success) {
        console.log('Setting API key:', data.agent.api_key);
        setApiKey(data.agent.api_key);
        console.log('Setting step to done');
        setStep('done');
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
        onComplete?.(data.agent.api_key, agentName);
      } else {
        console.log('Error:', data.error);
        setError(data.error || 'Failed to register agent.');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setVerifying(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStepIndicator = () => {
    const steps = [
      { key: 'name', label: 'Name' },
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
              Give your AI agent a name to get started with SolSkill.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                value={agentName}
                onChange={(e) => setAgentName(e.target.value)}
                placeholder="Agent name (e.g., Major, Claude, Devin)"
                className="flex-1 bg-black border border-gray-700 rounded-xl px-4 py-3 focus:border-[#14F195] outline-none transition"
                maxLength={50}
                disabled={verifying}
                onKeyDown={(e) => e.key === 'Enter' && !verifying && handleNameSubmit()}
              />
              <button
                onClick={handleNameSubmit}
                disabled={!agentName.trim() || verifying}
                className="px-6 py-3 bg-gradient-to-r from-[#14F195] to-[#0fd884] hover:opacity-90 text-black font-bold rounded-xl transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {verifying ? (
                  <>
                    <LoadingDots size={20} />
                    Creating...
                  </>
                ) : (
                  'Create Agent →'
                )}
              </button>
            </div>
            {error && (
              <p className="text-red-400 text-sm mt-4">❌ {error}</p>
            )}
          </div>
        )}

        {/* Step 2: Done */}
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
                  setApiKey('');
                  setError('');
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
