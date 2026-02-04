import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

/**
 * GET /api/v1/wallet/receive
 * Returns the agent's wallet address for receiving deposits.
 * Includes QR code data for easy deposits.
 */
export async function GET(req: NextRequest) {
  try {
    // Get API key - this endpoint is public-ish but benefits from authentication
    const apiKey = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '');
    
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key required. Use x-api-key header or Bearer token.' },
        { status: 401 }
      );
    }

    if (!db.validateApiKey(apiKey)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or unverified API key' },
        { status: 401 }
      );
    }

    // Get agent from API key
    const agent = db.getAgentByApiKey(apiKey);
    if (!agent) {
      return NextResponse.json(
        { success: false, error: 'Agent not found' },
        { status: 404 }
      );
    }

    if (!agent.wallet) {
      return NextResponse.json(
        { success: false, error: 'Agent wallet not configured. Complete registration first.' },
        { status: 400 }
      );
    }

    const walletAddress = agent.wallet;

    // Generate Solana Pay URL for QR code
    // Format: solana:<recipient>?amount=<amount>&label=<label>&message=<message>
    // Without amount for general deposit address
    const solanaPayUrl = `solana:${walletAddress}`;

    // Generate a simple QR code URL using a public service
    // Agents can use this directly or generate their own QR
    const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(solanaPayUrl)}`;

    // Alternative: Generate QR for just the address (for wallets that don't support Solana Pay)
    const qrCodeAddressUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(walletAddress)}`;

    return NextResponse.json({
      success: true,
      wallet: walletAddress,
      agentId: agent.id,
      agentName: agent.name,
      deposit: {
        // The wallet address to send funds to
        address: walletAddress,
        
        // Solana Pay compatible URL
        solanaPayUrl,
        
        // QR code image URLs (hosted by qrserver.com)
        qrCode: {
          // Solana Pay format QR
          solanaPayQr: qrCodeUrl,
          // Plain address QR (more compatible)
          addressQr: qrCodeAddressUrl,
        },
        
        // Instructions for depositing
        instructions: [
          `Send SOL or SPL tokens to: ${walletAddress}`,
          'Scan the QR code with a Solana wallet app',
          'Or use the Solana Pay URL for compatible apps',
          'Minimum recommended: 0.01 SOL (for transaction fees)',
        ],
      },
      // Network info
      network: process.env.SOLANA_NETWORK || 'mainnet-beta',
      // Explorer link
      explorer: `https://solscan.io/account/${walletAddress}`,
    });

  } catch (error: any) {
    console.error('Wallet receive error:', error);
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to get receive address' },
      { status: 500 }
    );
  }
}
