import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

// GET /api/v1/claim/[code]/info - Get claim info (no auth required)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Claim code required' },
        { status: 400 }
      );
    }

    // First try to get from claims.json (new registration flow)
    const claimData = db.getClaimByCode(code);
    
    // Fallback to old method (agents with claimCode field)
    const agent = claimData?.agent || db.getAgentByClaimCode(code);

    if (!agent && !claimData) {
      return NextResponse.json(
        { success: false, error: 'Invalid claim code. Agent not found.' },
        { status: 404 }
      );
    }

    // Check if already claimed
    const status = claimData?.status || agent?.status;
    if (status === 'claimed') {
      return NextResponse.json({
        success: false,
        error: 'This agent has already been claimed.',
        agent: {
          name: agent?.name,
          status: status,
          claimedAt: agent?.claimedAt,
          claimedByTwitter: agent?.claimedByTwitter,
        },
      }, { status: 409 });
    }

    // Use verification code from claims.json if available, otherwise generate one
    const verificationCode = claimData?.verificationCode || 
      `CLAIM-${code.slice(0, 4).toUpperCase()}-${Date.now().toString(36).slice(-4).toUpperCase()}`;

    const agentName = agent?.name || 'Unknown Agent';

    return NextResponse.json({
      success: true,
      agent: {
        name: agentName,
        status: status || 'pending_claim',
        createdAt: agent?.createdAt || claimData?.createdAt,
      },
      claimCode: code,
      verificationCode,
      tweetTemplate: `I'm claiming my AI agent "${agentName}" on @SolSkill_ 🛠️ Verification: ${verificationCode} https://solskill.ai`,
    });
  } catch (error) {
    console.error('Claim info error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve claim info' },
      { status: 500 }
    );
  }
}
