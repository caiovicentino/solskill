# 🛠️ SolSkill - DeFi Skills for AI Agents

**Give your AI agent a wallet. Let it trade, lend, and earn yield on Solana.**

[![Live Demo](https://img.shields.io/badge/demo-solskill.ai-blue?style=for-the-badge)](https://solskill.ai)
[![Skill Spec](https://img.shields.io/badge/skill-spec-green?style=for-the-badge)](https://solskill.ai/skill.md)

---

## 🎯 What is SolSkill?

SolSkill enables AI agents to perform **self-custodial DeFi operations** on Solana. No shared keys, no centralized custody—each agent gets its own embedded wallet powered by Privy.

Think of it as a **DeFi skill layer** for autonomous agents:
- 🔄 **Swap tokens** via Jupiter aggregator
- 🏦 **Lend & borrow** on Kamino Finance
- 📈 **Deposit into yield vaults** for passive income
- 💰 **Manage portfolio** across Solana DeFi

## 🚀 Quick Start for Agents

### 1. Register Your Agent

```bash
curl -X POST https://solskill.ai/api/v1/agents/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-trading-agent",
    "description": "Automated DeFi trader"
  }'
```

**Response:**
```json
{
  "agentId": "agent_abc123",
  "apiKey": "sk_live_...",
  "walletAddress": "7xKXtg...",
  "claimCode": "CLAWFI-ABC123"
}
```

### 2. Fund the Wallet

Send SOL to your agent's wallet address, or have a human claim ownership using the `claimCode`.

### 3. Start Trading

```bash
# Swap 1 SOL for USDC
curl -X POST https://solskill.ai/api/v1/swap \
  -H "Authorization: Bearer sk_live_..." \
  -H "Content-Type: application/json" \
  -d '{
    "inputMint": "So11111111111111111111111111111111111111112",
    "outputMint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    "amount": 1000000000,
    "slippageBps": 50
  }'
```

## ✨ Features

### 🤖 Agent Self-Registration
Agents can create their own wallets programmatically—no human intervention needed for setup.

### 🔐 Human Claim Verification
Wallet ownership can be claimed by humans using a verification code, enabling hybrid human-agent control.

### 📊 Real-Time Dashboard
Monitor all agent activity, balances, and transactions at [solskill.ai/dashboard](https://solskill.ai/dashboard).

### 📝 Activity Logging
Complete audit trail of every operation for compliance and debugging.

### 🛡️ Self-Custodial Security
Each agent has its own Privy embedded wallet. Private keys never leave the secure enclave.

## 🔧 API Endpoints

### Agent Management
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/agents/register` | POST | - | Create a new agent wallet |
| `/api/v1/agents/:id/claim` | POST | - | Human claims agent ownership |
| `/api/v1/activity` | GET | API Key | Get agent activity log |

### Wallet Operations
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/wallet/balance` | GET | - | Get wallet SOL & token balances |
| `/api/v1/wallet/send` | POST | API Key | Send SOL or SPL tokens |
| `/api/v1/wallet/receive` | GET | API Key | Get deposit address + QR code |
| `/api/v1/wallet/transactions` | GET | API Key | Get recent transactions |

### Jupiter (Swaps)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/jupiter/tokens` | GET | - | List available tokens |
| `/api/v1/jupiter/quote` | GET | - | Get swap quote |
| `/api/v1/jupiter/swap` | POST | API Key | Execute token swap |

### Kamino Finance (Lending & Vaults)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/kamino/markets` | GET | - | List lending markets |
| `/api/v1/kamino/reserves` | GET | - | Get market reserves |
| `/api/v1/kamino/vaults` | GET | - | List yield vaults |
| `/api/v1/kamino/deposit` | POST | API Key | Deposit/withdraw from lending |
| `/api/v1/kamino/borrow` | POST | API Key | Borrow/repay assets |
| `/api/v1/kamino/positions` | GET | API Key | Get user positions |

### Raydium (Liquidity Pools)
| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/v1/raydium/pools` | GET | - | List pools with TVL, APY, tokens |
| `/api/v1/raydium/pools/:poolId` | GET | - | Get specific pool details |
| `/api/v1/raydium/pools/add-liquidity` | POST | API Key | Add liquidity to pool |
| `/api/v1/raydium/pools/remove-liquidity` | POST | API Key | Remove liquidity from pool |

## 🏗️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 16, React, TailwindCSS |
| **Auth & Wallets** | Privy Embedded Wallets |
| **Blockchain** | Solana |
| **DEX Aggregation** | Jupiter |
| **Lending & Vaults** | Kamino Finance |
| **Database** | PostgreSQL |

## 📖 Skill Specification

SolSkill follows the emerging **Agent Skill** specification. The full skill definition is available at:

**[https://solskill.ai/skill.md](https://solskill.ai/skill.md)**

This allows any compatible AI agent to discover and use SolSkill capabilities automatically.

## 🔒 Security Model

1. **Embedded Wallets**: Each agent gets a unique Privy embedded wallet
2. **No Shared Keys**: Private keys are never exposed to the application layer
3. **Human Override**: Claim system allows humans to take control when needed
4. **Rate Limiting**: API rate limits prevent abuse
5. **Audit Logging**: Every transaction is logged for review

## 🎮 Example Use Cases

### Autonomous Trading Bot
```python
# Agent detects arbitrage opportunity
solskill.swap(input="SOL", output="USDC", amount=10)
# ... wait for price movement ...
solskill.swap(input="USDC", output="SOL", amount=calculated_amount)
```

### Yield Optimization
```python
# Agent finds best yield and deposits
best_vault = solskill.get_best_vault(asset="USDC")
solskill.kamino_deposit(vault=best_vault, amount=1000)
```

### Portfolio Rebalancing
```python
# Agent maintains target allocation
balances = solskill.get_balances()
if balances["SOL"] / total > 0.5:
    solskill.swap(input="SOL", output="USDC", amount=excess)
```

## 🌐 Links

- **Live App**: [https://solskill.ai](https://solskill.ai)
- **Skill Spec**: [https://solskill.ai/skill.md](https://solskill.ai/skill.md)
- **API Docs**: [https://solskill.ai/docs](https://solskill.ai/docs)

## 🏆 Hackathon Submission

Built for **AI Agents x DeFi Hackathon** — demonstrating how autonomous agents can safely participate in decentralized finance with proper custody and human oversight.

---

<p align="center">
  <b>🛠️ SolSkill — Because your AI deserves a wallet too.</b>
</p>
