import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { isValidSolanaAddress } from '@/lib/solana';

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  { commitment: 'confirmed' }
);

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const wallet = searchParams.get('wallet');

    // Validate wallet param exists
    if (!wallet) {
      return NextResponse.json(
        { success: false, error: 'Missing required param: wallet' },
        { status: 400 }
      );
    }

    // Validate wallet format
    if (!isValidSolanaAddress(wallet)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address. Must be a valid Solana public key (32-44 base58 characters).' },
        { status: 400 }
      );
    }

    const pubkey = new PublicKey(wallet);

    // Get SOL balance with timeout
    const balancePromise = connection.getBalance(pubkey);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('RPC timeout')), 10000)
    );

    const balance = await Promise.race([balancePromise, timeoutPromise]);
    const solBalance = balance / LAMPORTS_PER_SOL;

    // Get token accounts with timeout
    const tokenAccountsPromise = connection.getParsedTokenAccountsByOwner(pubkey, {
      programId: new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA'),
    });

    const tokenAccounts = await Promise.race([tokenAccountsPromise, timeoutPromise]);

    const tokens = tokenAccounts.value
      .map((ta) => {
        const info = ta.account.data.parsed.info;
        return {
          mint: info.mint,
          amount: info.tokenAmount.uiAmountString,
          decimals: info.tokenAmount.decimals,
        };
      })
      .filter((t) => parseFloat(t.amount) > 0);

    return NextResponse.json({
      success: true,
      wallet,
      sol: solBalance.toFixed(9),
      solLamports: balance.toString(),
      tokens,
      tokenCount: tokens.length,
    });
  } catch (error: any) {
    console.error('Balance check error:', error);
    
    if (error.message === 'RPC timeout') {
      return NextResponse.json(
        { success: false, error: 'Solana RPC timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: 'Failed to get balance' },
      { status: 500 }
    );
  }
}
