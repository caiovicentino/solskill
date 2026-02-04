import { NextRequest, NextResponse } from 'next/server';
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction,
  Keypair,
} from '@solana/web3.js';
import {
  getAssociatedTokenAddress,
  createTransferInstruction,
  getAccount,
  TOKEN_PROGRAM_ID,
  getMint,
} from '@solana/spl-token';
import { isValidSolanaAddress, isValidAmount } from '@/lib/solana';
import { db } from '@/lib/db';

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  { commitment: 'confirmed' }
);

// Native SOL mint address (wrapped SOL)
const SOL_MINT = 'So11111111111111111111111111111111111111112';

export async function POST(req: NextRequest) {
  try {
    // Validate API key
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
    if (!agent || !agent.wallet) {
      return NextResponse.json(
        { success: false, error: 'Agent wallet not configured. Complete registration first.' },
        { status: 400 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { to, amount, mint } = body;

    // Validate 'to' address
    if (!to || !isValidSolanaAddress(to)) {
      return NextResponse.json(
        { success: false, error: 'Invalid recipient address. Must be a valid Solana public key.' },
        { status: 400 }
      );
    }

    // Validate amount
    if (!isValidAmount(amount)) {
      return NextResponse.json(
        { success: false, error: 'Invalid amount. Must be a positive number.' },
        { status: 400 }
      );
    }

    // Validate mint if provided
    if (mint && mint !== SOL_MINT && !isValidSolanaAddress(mint)) {
      return NextResponse.json(
        { success: false, error: 'Invalid token mint address.' },
        { status: 400 }
      );
    }

    const fromPubkey = new PublicKey(agent.wallet);
    const toPubkey = new PublicKey(to);

    // Check if this is a SOL transfer or SPL token transfer
    const isNativeSOL = !mint || mint === SOL_MINT;

    if (isNativeSOL) {
      // SOL Transfer
      const lamports = Math.floor(amount * LAMPORTS_PER_SOL);

      // Check balance
      const balance = await connection.getBalance(fromPubkey);
      if (balance < lamports) {
        return NextResponse.json(
          { 
            success: false, 
            error: `Insufficient SOL balance. Have: ${balance / LAMPORTS_PER_SOL} SOL, Need: ${amount} SOL` 
          },
          { status: 400 }
        );
      }

      // Build transaction
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Serialize for signing (agent needs to sign this)
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64');

      // Increment usage count
      db.incrementRequestCount(apiKey);

      return NextResponse.json({
        success: true,
        type: 'sol',
        transaction: serializedTx,
        from: agent.wallet,
        to,
        amount,
        amountLamports: lamports.toString(),
        lastValidBlockHeight,
        instructions: {
          step1: 'Deserialize transaction (base64 encoded legacy transaction)',
          step2: 'Sign with agent wallet private key',
          step3: 'Send to Solana RPC using sendRawTransaction',
          step4: 'Confirm transaction',
        },
      });

    } else {
      // SPL Token Transfer
      const mintPubkey = new PublicKey(mint);

      // Get mint info for decimals
      let decimals: number;
      try {
        const mintInfo = await getMint(connection, mintPubkey);
        decimals = mintInfo.decimals;
      } catch {
        return NextResponse.json(
          { success: false, error: `Could not find token mint: ${mint}` },
          { status: 400 }
        );
      }

      // Calculate amount in smallest units
      const tokenAmount = BigInt(Math.floor(amount * Math.pow(10, decimals)));

      // Get source token account
      const fromTokenAccount = await getAssociatedTokenAddress(mintPubkey, fromPubkey);
      
      // Get destination token account
      const toTokenAccount = await getAssociatedTokenAddress(mintPubkey, toPubkey);

      // Check source balance
      try {
        const sourceAccount = await getAccount(connection, fromTokenAccount);
        if (sourceAccount.amount < tokenAmount) {
          return NextResponse.json(
            { 
              success: false, 
              error: `Insufficient token balance. Have: ${Number(sourceAccount.amount) / Math.pow(10, decimals)}, Need: ${amount}` 
            },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { success: false, error: 'Source token account not found. Agent has no balance of this token.' },
          { status: 400 }
        );
      }

      // Check if destination token account exists
      let destinationExists = true;
      try {
        await getAccount(connection, toTokenAccount);
      } catch {
        destinationExists = false;
      }

      // Build transaction
      const transaction = new Transaction();

      // If destination doesn't exist, we need to create it
      // Note: Creating ATA requires additional instruction (not included here for simplicity)
      if (!destinationExists) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Recipient does not have a token account for this mint. They need to create one first, or use createAssociatedTokenAccountInstruction.' 
          },
          { status: 400 }
        );
      }

      // Add transfer instruction
      transaction.add(
        createTransferInstruction(
          fromTokenAccount,
          toTokenAccount,
          fromPubkey,
          tokenAmount,
          [],
          TOKEN_PROGRAM_ID
        )
      );

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      // Serialize for signing
      const serializedTx = transaction.serialize({
        requireAllSignatures: false,
        verifySignatures: false,
      }).toString('base64');

      // Increment usage count
      db.incrementRequestCount(apiKey);

      return NextResponse.json({
        success: true,
        type: 'spl',
        transaction: serializedTx,
        from: agent.wallet,
        to,
        amount,
        mint,
        decimals,
        amountRaw: tokenAmount.toString(),
        lastValidBlockHeight,
        instructions: {
          step1: 'Deserialize transaction (base64 encoded legacy transaction)',
          step2: 'Sign with agent wallet private key',
          step3: 'Send to Solana RPC using sendRawTransaction',
          step4: 'Confirm transaction',
        },
      });
    }

  } catch (error: any) {
    console.error('Wallet send error:', error);
    
    if (error.message?.includes('timeout') || error.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Solana RPC timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create transfer transaction' },
      { status: 500 }
    );
  }
}
