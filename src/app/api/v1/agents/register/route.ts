import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, description } = body;

    // Validate name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Agent name is required' },
        { status: 400 }
      );
    }

    if (name.length > 100) {
      return NextResponse.json(
        { success: false, error: 'Agent name must be 100 characters or less' },
        { status: 400 }
      );
    }

    // Generate credentials (stateless - works on every cold start)
    const apiKey = `solskill_${randomBytes(24).toString('hex')}`;
    const agentId = randomUUID();

    console.log(`Agent registered: ${name} - ${agentId}`);

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: name.trim(),
        description: description?.trim() || null,
        api_key: apiKey,
        verified: true,
        createdAt: new Date().toISOString(),
      },
      usage: {
        rateLimit: '100 requests/minute',
        endpoints: 'All public endpoints + protected endpoints with API key',
      },
      important: 'SAVE YOUR API KEY! It will not be shown again. Include it as x-api-key header in requests.',
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register agent' },
      { status: 500 }
    );
  }
}
