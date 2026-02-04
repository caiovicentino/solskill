import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { db, Agent } from '@/lib/db';
import { fetchWithTimeout } from '@/lib/solana';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, wallet, userId, twitterUsername, tweetUrl, verificationCode } = body;

    // Validate required fields
    if (!name || !userId || !verificationCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: name, userId, verificationCode' },
        { status: 400 }
      );
    }

    // Validate name
    if (name.length < 2 || name.length > 50) {
      return NextResponse.json(
        { success: false, error: 'Agent name must be 2-50 characters' },
        { status: 400 }
      );
    }

    // Tweet URL is required for verification
    if (!tweetUrl) {
      return NextResponse.json(
        { success: false, error: 'Tweet URL required for verification' },
        { status: 400 }
      );
    }

    // Extract tweet ID from URL
    const tweetIdMatch = tweetUrl.match(/status\/(\d+)/);
    if (!tweetIdMatch) {
      return NextResponse.json(
        { success: false, error: 'Invalid tweet URL. Expected format: https://x.com/username/status/123...' },
        { status: 400 }
      );
    }
    const tweetId = tweetIdMatch[1];

    // Verify the tweet
    const verified = await verifyTweet(tweetId, verificationCode, name);
    
    if (!verified.success) {
      return NextResponse.json(
        { success: false, error: verified.error || 'Tweet verification failed. Make sure you posted the exact verification text.' },
        { status: 400 }
      );
    }

    // Check if user already has an agent
    if (verified.twitterUsername) {
      const existingAgent = db.getAgentByTwitter(verified.twitterUsername);
      if (existingAgent) {
        return NextResponse.json(
          { success: false, error: 'You already have a registered agent. Contact support to register additional agents.' },
          { status: 409 }
        );
      }
    }

    // Generate secure API key
    const apiKey = `solskill_${crypto.randomBytes(32).toString('hex')}`;

    // Create agent
    const agent: Agent = {
      id: crypto.randomUUID(),
      name: name.trim(),
      wallet: wallet || 'embedded',
      userId,
      twitterUsername: verified.twitterUsername || twitterUsername,
      tweetId,
      tweetUrl,
      apiKey,
      verified: true,
      verifiedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      requestCount: 0,
    };

    db.createAgent(agent);

    return NextResponse.json({
      success: true,
      message: 'Agent verified and registered successfully!',
      agent: {
        id: agent.id,
        name: agent.name,
        twitterUsername: agent.twitterUsername,
        apiKey: agent.apiKey,
        createdAt: agent.createdAt,
      },
      skillFile: 'https://solskill.ai/skill.md',
      important: '⚠️ Save your API key securely. It cannot be recovered if lost.',
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Registration failed. Please try again.' },
      { status: 500 }
    );
  }
}

async function verifyTweet(
  tweetId: string, 
  verificationCode: string, 
  agentName: string
): Promise<{ success: boolean; error?: string; twitterUsername?: string }> {
  
  const bearerToken = process.env.TWITTER_BEARER_TOKEN;
  
  // Method 1: Twitter API v2 (preferred)
  if (bearerToken) {
    try {
      const response = await fetchWithTimeout(
        `https://api.twitter.com/2/tweets/${tweetId}?expansions=author_id&user.fields=username`,
        {
          headers: {
            Authorization: `Bearer ${bearerToken}`,
          },
        },
        10000
      );

      if (response.ok) {
        const data = await response.json();
        const tweetText = data.data?.text || '';
        const twitterUsername = data.includes?.users?.[0]?.username;

        // Check if tweet contains verification code
        if (!tweetText.includes(verificationCode)) {
          return { 
            success: false, 
            error: `Tweet does not contain verification code: ${verificationCode}` 
          };
        }

        // Check if tweet mentions SolSkill
        if (!tweetText.toLowerCase().includes('solskill')) {
          return { 
            success: false, 
            error: 'Tweet must mention @SolSkill_' 
          };
        }

        return { success: true, twitterUsername };
      } else if (response.status === 404) {
        return { success: false, error: 'Tweet not found. Make sure the URL is correct and the tweet is public.' };
      }
    } catch (error) {
      console.error('Twitter API error:', error);
      // Fall through to alternative method
    }
  }

  // Method 2: Syndica or alternative verification service
  // For hackathon without Twitter API, use manual verification flag
  if (process.env.ALLOW_MANUAL_VERIFICATION === 'true') {
    console.warn(`[SolSkill] Manual verification mode - tweet ${tweetId} accepted without API check`);
    return { 
      success: true,
      twitterUsername: undefined,
    };
  }

  // No verification method available
  return { 
    success: false, 
    error: 'Twitter verification is currently unavailable. Please try again later or contact support.' 
  };
}

// GET endpoint to check agent status
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const apiKey = searchParams.get('apiKey');

  if (!apiKey) {
    return NextResponse.json(
      { success: false, error: 'API key required' },
      { status: 400 }
    );
  }

  const agent = db.getAgentByApiKey(apiKey);
  
  if (!agent) {
    return NextResponse.json(
      { success: false, error: 'Agent not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    agent: {
      id: agent.id,
      name: agent.name,
      twitterUsername: agent.twitterUsername,
      verified: agent.verified,
      createdAt: agent.createdAt,
      requestCount: agent.requestCount,
    },
  });
}
