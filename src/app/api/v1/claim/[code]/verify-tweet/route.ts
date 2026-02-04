import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { fetchWithTimeout } from '@/lib/solana';

// POST /api/v1/claim/[code]/verify-tweet - Verify tweet and complete claim
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    const body = await req.json();
    const { tweetUrl, verificationCode } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Claim code required' },
        { status: 400 }
      );
    }

    if (!tweetUrl || !verificationCode) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: tweetUrl, verificationCode' },
        { status: 400 }
      );
    }

    const agent = db.getAgentByClaimCode(code);

    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Invalid claim code. Agent not found.' },
        { status: 404 }
      );
    }

    // Check if already claimed
    if (agent.status === 'claimed') {
      return NextResponse.json(
        { success: false, error: 'This agent has already been claimed.' },
        { status: 409 }
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
    const verified = await verifyClaimTweet(tweetId, verificationCode, agent.name);

    if (!verified.success) {
      return NextResponse.json(
        { success: false, error: verified.error || 'Tweet verification failed.' },
        { status: 400 }
      );
    }

    // Update agent status to claimed
    const updatedAgent = db.updateAgentById(agent.id, {
      status: 'claimed',
      claimedBy: verified.twitterUserId,
      claimedByTwitter: verified.twitterUsername,
      claimedAt: new Date().toISOString(),
      claimTweetId: tweetId,
      claimTweetUrl: tweetUrl,
    });

    if (!updatedAgent) {
      return NextResponse.json(
        { success: false, error: 'Failed to update agent status' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: `🛠️ Congratulations! Agent "${agent.name}" is now claimed by @${verified.twitterUsername || 'you'}!`,
      agent: {
        id: updatedAgent.id,
        name: updatedAgent.name,
        status: updatedAgent.status,
        claimedByTwitter: updatedAgent.claimedByTwitter,
        claimedAt: updatedAgent.claimedAt,
      },
    });
  } catch (error) {
    console.error('Claim verification error:', error);
    return NextResponse.json(
      { success: false, error: 'Claim verification failed. Please try again.' },
      { status: 500 }
    );
  }
}

async function verifyClaimTweet(
  tweetId: string,
  verificationCode: string,
  agentName: string
): Promise<{ success: boolean; error?: string; twitterUsername?: string; twitterUserId?: string }> {
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
        const twitterUserId = data.includes?.users?.[0]?.id;

        // Check if tweet contains verification code
        if (!tweetText.includes(verificationCode)) {
          return {
            success: false,
            error: `Tweet does not contain verification code: ${verificationCode}`,
          };
        }

        // Check if tweet mentions SolSkill
        if (!tweetText.toLowerCase().includes('solskill')) {
          return {
            success: false,
            error: 'Tweet must mention @SolSkill_',
          };
        }

        // Check if tweet mentions "claiming" and the agent name
        if (!tweetText.toLowerCase().includes('claiming') || !tweetText.includes(agentName)) {
          return {
            success: false,
            error: `Tweet must contain "claiming" and the agent name "${agentName}"`,
          };
        }

        return { success: true, twitterUsername, twitterUserId };
      } else if (response.status === 404) {
        return {
          success: false,
          error: 'Tweet not found. Make sure the URL is correct and the tweet is public.',
        };
      }
    } catch (error) {
      console.error('Twitter API error:', error);
      // Fall through to alternative method
    }
  }

  // Method 2: Manual verification mode for hackathon
  if (process.env.ALLOW_MANUAL_VERIFICATION === 'true') {
    console.warn(`[SolSkill] Manual verification mode - claim tweet ${tweetId} accepted without API check`);
    return {
      success: true,
      twitterUsername: undefined,
      twitterUserId: undefined,
    };
  }

  // No verification method available
  return {
    success: false,
    error: 'Twitter verification is currently unavailable. Please try again later or contact support.',
  };
}
