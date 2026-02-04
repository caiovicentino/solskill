import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'crypto';
import { db, Agent } from '@/lib/db';

// Word list for verification codes (ocean/reef themed)
const VERIFICATION_WORDS = ['claw', 'reef', 'wave', 'tide', 'shell', 'coral'];

// Generate random alphanumeric string
function randomChars(length: number): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing chars (0/O, 1/I)
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate verification code: word-XXXX (e.g., "claw-X4B2")
function generateVerificationCode(): string {
  const word = VERIFICATION_WORDS[Math.floor(Math.random() * VERIFICATION_WORDS.length)];
  const code = randomChars(4);
  return `${word}-${code}`;
}

// Generate short claim code
function generateClaimCode(): string {
  return `solskill_claim_${randomChars(8)}`;
}

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

    // Validate description if provided
    if (description && (typeof description !== 'string' || description.length > 500)) {
      return NextResponse.json(
        { success: false, error: 'Description must be 500 characters or less' },
        { status: 400 }
      );
    }

    // Generate credentials
    const apiKey = `solskill_${randomUUID()}`;
    const claimCode = generateClaimCode();
    const verificationCode = generateVerificationCode();
    const agentId = randomUUID();

    // Build claim URL
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://solskill.ai';
    const claimUrl = `${baseUrl}/claim/${claimCode}`;

    // Create agent record with pending status
    const agent: Agent = {
      id: agentId,
      name: name.trim(),
      wallet: '', // Will be set during claim
      userId: '', // Will be set during claim
      apiKey,
      verified: false, // pending_claim status
      createdAt: new Date().toISOString(),
      requestCount: 0,
      // Extended fields for registration flow
      ...(description && { description: description.trim() }),
      // Store claim/verification codes (would be in separate table in production)
    };

    // Store in DB
    db.createAgent(agent);

    // Store claim code mapping (in production, this would be a separate table)
    // For hackathon, we'll add it to a claims file
    storeClaimCode(claimCode, {
      agentId,
      apiKey,
      verificationCode,
      createdAt: new Date().toISOString(),
      status: 'pending_claim',
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agentId,
        name: name.trim(),
        api_key: apiKey,
        claim_url: claimUrl,
        claim_code: claimCode,
        verification_code: verificationCode,
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

// Store claim code mapping (hackathon simple storage)
function storeClaimCode(claimCode: string, data: {
  agentId: string;
  apiKey: string;
  verificationCode: string;
  createdAt: string;
  status: string;
}) {
  const { readFileSync, writeFileSync, existsSync, mkdirSync } = require('fs');
  const { join } = require('path');
  
  const DATA_DIR = join(process.cwd(), '.data');
  const CLAIMS_FILE = join(DATA_DIR, 'claims.json');
  
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
  
  let claims: Record<string, any> = {};
  if (existsSync(CLAIMS_FILE)) {
    try {
      claims = JSON.parse(readFileSync(CLAIMS_FILE, 'utf-8'));
    } catch {
      claims = {};
    }
  }
  
  claims[claimCode] = data;
  writeFileSync(CLAIMS_FILE, JSON.stringify(claims, null, 2));
}
