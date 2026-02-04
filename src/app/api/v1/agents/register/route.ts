import { NextRequest, NextResponse } from 'next/server';
import { randomUUID, randomBytes } from 'crypto';

// In-memory store for hackathon (resets on cold start, but that's OK for demo)
const agentsStore = new Map<string, any>();

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

    // Generate credentials
    const apiKey = `solskill_${randomBytes(24).toString('hex')}`;
    const agentId = randomUUID();

    // Create agent record
    const agent = {
      id: agentId,
      name: name.trim(),
      description: description?.trim(),
      apiKey,
      verified: true, // Auto-verified for hackathon
      createdAt: new Date().toISOString(),
      requestCount: 0,
    };

    // Store in memory
    agentsStore.set(apiKey, agent);

    console.log(`✅ Agent registered: ${name} - ${agentId}`);

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: name.trim(),
        api_key: apiKey,
      },
      important: '⚠️ SAVE YOUR API KEY! It will not be shown again.',
    });
  } catch (error) {
    console.error('Agent registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to register agent' },
      { status: 500 }
    );
  }
}
