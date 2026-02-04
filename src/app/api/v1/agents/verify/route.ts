import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'crypto';
import { db } from '@/lib/db';
import { verifyTweet, extractTweetId } from '@/lib/twitter-verify';
import { checkRateLimit, RATE_LIMITS, getClientIp } from '@/lib/rate-limit';

// Generate API key
function generateApiKey(): string {
  return `solskill_${randomBytes(24).toString('hex')}`;
}

/**
 * POST /api/v1/agents/verify
 * 
 * Verify an agent registration via Twitter tweet.
 * 
 * Body:
 * - agentName: string (required) - Name of the agent
 * - verificationCode: string (required) - Code that must be in the tweet
 * - tweetUrl: string (required) - URL of the verification tweet
 * - description?: string (optional) - Agent description
 * 
 * Returns:
 * - success: boolean
 * - apiKey: string (only if success)
 * - twitterUsername: string (extracted from tweet)
 * - agent: object with agent details
 */
export async function POST(req: NextRequest) {
  try {
    // Rate limiting
    const clientIp = getClientIp(req);
    const rateLimitResult = checkRateLimit(`verify:${clientIp}`, RATE_LIMITS.VERIFY);
    
    if (!rateLimitResult.allowed) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Rate limit exceeded. Please try again later.',
          retryAfterMs: rateLimitResult.retryAfterMs,
        },
        { 
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rateLimitResult.retryAfterMs || 60000) / 1000)),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': String(rateLimitResult.resetAt),
          }
        }
      );
    }

    const body = await req.json();
    const { agentName, verificationCode, tweetUrl, description } = body;

    // Validate required fields
    if (!agentName || typeof agentName !== 'string' || agentName.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'agentName is required' },
        { status: 400 }
      );
    }

    if (!verificationCode || typeof verificationCode !== 'string') {
      return NextResponse.json(
        { success: false, error: 'verificationCode is required' },
        { status: 400 }
      );
    }

    if (!tweetUrl || typeof tweetUrl !== 'string') {
      return NextResponse.json(
        { success: false, error: 'tweetUrl is required' },
        { status: 400 }
      );
    }

    // Validate lengths
    if (agentName.length > 100) {
      return NextResponse.json(
        { success: false, error: 'agentName must be 100 characters or less' },
        { status: 400 }
      );
    }

    if (description && (typeof description !== 'string' || description.length > 500)) {
      return NextResponse.json(
        { success: false, error: 'description must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Extract and validate tweet ID
    const tweetId = extractTweetId(tweetUrl);
    if (!tweetId) {
      return NextResponse.json(
        { success: false, error: 'Invalid tweet URL format. Please provide a valid Twitter/X URL.' },
        { status: 400 }
      );
    }

    // Verify the tweet
    console.log(`Verifying tweet ${tweetId} for code: ${verificationCode}`);
    const verificationResult = await verifyTweet(tweetUrl, verificationCode);

    if (!verificationResult.success) {
      return NextResponse.json(
        { success: false, error: verificationResult.error || 'Failed to verify tweet' },
        { status: 400 }
      );
    }

    if (!verificationResult.containsCode) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Tweet does not contain the verification code "${verificationCode}". Please make sure your tweet includes the exact code.`,
          tweetText: verificationResult.tweetData?.text?.substring(0, 100), // Show first 100 chars for debugging
        },
        { status: 400 }
      );
    }

    const tweetData = verificationResult.tweetData!;
    
    // Check if this Twitter username already has a verified agent
    const existingAgent = db.getAgentByTwitter(tweetData.authorUsername);
    if (existingAgent && existingAgent.verified) {
      return NextResponse.json(
        { 
          success: false, 
          error: `Twitter account @${tweetData.authorUsername} already has a verified agent. Each Twitter account can only verify one agent.`
        },
        { status: 409 }
      );
    }

    // Generate credentials
    const apiKey = generateApiKey();
    const agentId = randomUUID();

    // Create verified agent
    const agent = db.createAgent({
      id: agentId,
      name: agentName.trim(),
      description: description?.trim(),
      wallet: '', // Will be created via Privy or set later
      userId: '', // Will be set when owner claims via Privy
      twitterUsername: tweetData.authorUsername,
      tweetId: tweetData.id,
      tweetUrl: tweetUrl,
      apiKey,
      verified: true,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      requestCount: 0,
      status: 'active',
    });

    // Log successful verification
    console.log(`✅ Agent verified: ${agentName} (@${tweetData.authorUsername}) - ${agentId}`);

    return NextResponse.json({
      success: true,
      apiKey,
      twitterUsername: tweetData.authorUsername,
      agent: {
        id: agentId,
        name: agentName.trim(),
        description: description?.trim(),
        twitterUsername: tweetData.authorUsername,
        tweetId: tweetData.id,
        verified: true,
        verifiedAt: agent.verifiedAt,
        createdAt: agent.createdAt,
      },
      message: '🎉 Agent verified successfully! Save your API key - it will not be shown again.',
    }, {
      headers: {
        'X-RateLimit-Remaining': String(rateLimitResult.remaining),
        'X-RateLimit-Reset': String(rateLimitResult.resetAt),
      }
    });

  } catch (error) {
    console.error('Agent verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to verify agent. Please try again.' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/v1/agents/verify
 * 
 * Get verification instructions and generate a new verification code.
 * This can be used by agents to start the registration flow.
 */
export async function GET(req: NextRequest) {
  // Rate limiting
  const clientIp = getClientIp(req);
  const rateLimitResult = checkRateLimit(`verify-info:${clientIp}`, { windowMs: 60000, maxRequests: 30 });
  
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { success: false, error: 'Rate limit exceeded' },
      { status: 429 }
    );
  }

  // Generate a verification code for the user
  const words = ['claw', 'reef', 'wave', 'tide', 'shell', 'coral', 'ocean', 'pearl'];
  const word = words[Math.floor(Math.random() * words.length)];
  const code = randomBytes(2).toString('hex').toUpperCase();
  const verificationCode = `${word}-${code}`;

  return NextResponse.json({
    success: true,
    verificationCode,
    instructions: {
      step1: 'Tweet the verification code from your agent\'s Twitter account',
      step2: 'Copy the tweet URL',
      step3: 'Call POST /api/v1/agents/verify with agentName, verificationCode, and tweetUrl',
    },
    exampleTweet: `I'm registering my AI agent with @SolSkillAI 🤖\n\nVerification: ${verificationCode}`,
    endpoint: {
      method: 'POST',
      path: '/api/v1/agents/verify',
      body: {
        agentName: 'Your Agent Name',
        verificationCode,
        tweetUrl: 'https://x.com/youragent/status/123...',
        description: 'Optional description of your agent',
      },
    },
  });
}
