import { NextRequest, NextResponse } from 'next/server';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { db } from '@/lib/db';

const connection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  { commitment: 'confirmed' }
);

interface TokenChange {
  mint: string;
  before: number;
  after: number;
  change: number;
}

interface TransactionInfo {
  signature: string;
  slot: number;
  blockTime: number | null;
  timestamp: string | null;
  status: 'success' | 'failed';
  fee: number;
  feeSol: string;
  type: 'unknown' | 'transfer' | 'token_transfer' | 'swap' | 'stake' | 'other';
  description?: string;
  changes?: {
    sol?: { before: number; after: number; change: number };
    tokens?: TokenChange[];
  };
}

// Parse a transaction to extract relevant info
function parseTransaction(
  signature: string,
  slot: number,
  blockTime: number | null | undefined,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  tx: any,
  walletAddress: string
): TransactionInfo | null {
  if (!tx || !tx.meta) return null;

  const { meta } = tx;
  
  // Basic info
  const info: TransactionInfo = {
    signature,
    slot,
    blockTime: blockTime ?? null,
    timestamp: blockTime ? new Date(blockTime * 1000).toISOString() : null,
    status: meta.err ? 'failed' : 'success',
    fee: meta.fee,
    feeSol: (meta.fee / LAMPORTS_PER_SOL).toFixed(9),
    type: 'unknown',
  };

  // Try to determine transaction type and extract changes
  const preBalances = meta.preBalances;
  const postBalances = meta.postBalances;
  const accountKeys = tx.transaction.message.accountKeys.map((k: { pubkey: PublicKey } | string) => 
    typeof k === 'string' ? k : k.pubkey.toBase58()
  );

  // Find our wallet index
  const walletIndex = accountKeys.findIndex((k: string) => k === walletAddress);
  
  if (walletIndex !== -1 && preBalances && postBalances) {
    const solBefore = preBalances[walletIndex] / LAMPORTS_PER_SOL;
    const solAfter = postBalances[walletIndex] / LAMPORTS_PER_SOL;
    const solChange = solAfter - solBefore;

    info.changes = {
      sol: {
        before: solBefore,
        after: solAfter,
        change: solChange,
      },
    };

    // Determine type based on changes and instructions
    if (Math.abs(solChange) > 0.000001) {
      info.type = 'transfer';
      info.description = solChange > 0 
        ? `Received ${solChange.toFixed(6)} SOL` 
        : `Sent ${Math.abs(solChange).toFixed(6)} SOL`;
    }
  }

  // Check for token changes
  if (meta.preTokenBalances && meta.postTokenBalances) {
    const tokenChanges: TokenChange[] = [];

    // Process token balances
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const post of meta.postTokenBalances as any[]) {
      if (accountKeys[post.accountIndex] === walletAddress || 
          post.owner === walletAddress) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pre = (meta.preTokenBalances as any[]).find(
          (p: { mint: string; owner: string }) => p.mint === post.mint && p.owner === post.owner
        );
        
        const beforeAmount = pre?.uiTokenAmount?.uiAmount || 0;
        const afterAmount = post.uiTokenAmount?.uiAmount || 0;
        const change = afterAmount - beforeAmount;

        if (Math.abs(change) > 0) {
          tokenChanges.push({
            mint: post.mint,
            before: beforeAmount,
            after: afterAmount,
            change,
          });
        }
      }
    }

    if (tokenChanges.length > 0) {
      info.changes = info.changes || {};
      info.changes.tokens = tokenChanges;
      info.type = 'token_transfer';
      info.description = tokenChanges.map((t: TokenChange) => 
        t.change > 0 
          ? `Received ${t.change} tokens (${t.mint.slice(0, 8)}...)` 
          : `Sent ${Math.abs(t.change)} tokens (${t.mint.slice(0, 8)}...)`
      ).join(', ');
    }
  }

  // Check for common program interactions (simplified detection)
  const accountKeysStr = accountKeys.join(' ');
  
  // Jupiter (swap detection)
  if (accountKeysStr.includes('JUP')) {
    info.type = 'swap';
    info.description = 'Token swap via Jupiter';
  }

  // Stake program
  if (accountKeysStr.includes('Stake11111111111111111111111111111111111111')) {
    info.type = 'stake';
    info.description = 'Staking operation';
  }

  return info;
}

export async function GET(req: NextRequest) {
  try {
    // Get API key
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
        { success: false, error: 'Agent wallet not configured' },
        { status: 400 }
      );
    }

    // Parse query params
    const { searchParams } = new URL(req.url);
    const limitParam = searchParams.get('limit');
    const before = searchParams.get('before'); // Signature to paginate from

    // Validate and cap limit
    let limit = limitParam ? parseInt(limitParam, 10) : 10;
    if (isNaN(limit) || limit < 1) limit = 10;
    if (limit > 50) limit = 50; // Cap at 50 to prevent abuse

    const walletPubkey = new PublicKey(agent.wallet);

    // Build options for getSignaturesForAddress
    const options: { limit: number; before?: string } = { limit };
    if (before && typeof before === 'string') {
      options.before = before;
    }

    // Get signatures with timeout
    const signaturesPromise = connection.getSignaturesForAddress(walletPubkey, options);
    const timeoutPromise = new Promise<never>((_, reject) => 
      setTimeout(() => reject(new Error('RPC timeout')), 15000)
    );

    const signatures = await Promise.race([signaturesPromise, timeoutPromise]);

    if (signatures.length === 0) {
      return NextResponse.json({
        success: true,
        wallet: agent.wallet,
        transactions: [],
        count: 0,
        hasMore: false,
        message: 'No transactions found',
      });
    }

    // Fetch full transaction details (in batches to avoid rate limits)
    const BATCH_SIZE = 10;
    const transactions: TransactionInfo[] = [];
    
    for (let i = 0; i < signatures.length; i += BATCH_SIZE) {
      const batch = signatures.slice(i, i + BATCH_SIZE);
      const txPromises = batch.map(sig => 
        connection.getParsedTransaction(sig.signature, {
          maxSupportedTransactionVersion: 0,
        })
      );
      
      const txResults = await Promise.all(txPromises);
      
      for (let j = 0; j < txResults.length; j++) {
        const parsed = parseTransaction(
          batch[j].signature,
          batch[j].slot,
          batch[j].blockTime,
          txResults[j],
          agent.wallet
        );
        if (parsed) {
          transactions.push(parsed);
        }
      }
    }

    // Get the last signature for pagination
    const lastSignature = signatures.length > 0 ? signatures[signatures.length - 1].signature : null;

    // Increment usage count
    db.incrementRequestCount(apiKey);

    return NextResponse.json({
      success: true,
      wallet: agent.wallet,
      transactions,
      count: transactions.length,
      hasMore: signatures.length === limit,
      pagination: {
        limit,
        nextBefore: lastSignature,
        instruction: 'To get more transactions, pass nextBefore as the "before" query parameter',
      },
      explorer: `https://solscan.io/account/${agent.wallet}`,
    });

  } catch (error: unknown) {
    const err = error as Error;
    console.error('Wallet transactions error:', err);
    
    if (err.message === 'RPC timeout' || err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error: 'Solana RPC timeout. Please try again.' },
        { status: 504 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to get transactions' },
      { status: 500 }
    );
  }
}
