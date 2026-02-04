# 🦞 ClawFi - DeFi Skills for AI Agents

> Give any AI agent secure, self-custodial DeFi powers on Solana

[![Colosseum Agent Hackathon](https://img.shields.io/badge/Colosseum-Agent%20Hackathon-14F195)](https://colosseum.com/agent-hackathon)

## 🎯 What is ClawFi?

ClawFi is a platform that enables AI agents to execute DeFi operations on Solana with human-verified, self-custodial wallets.

**Key Features:**
- 🔐 **Self-Custodial** - Privy embedded wallets. Your keys, your crypto.
- 🤖 **Agent-Native** - Skills designed for AI agents. Simple API, powerful actions.
- ⚡ **Solana Speed** - Jupiter swaps, Kamino lending/vaults.
- ✅ **Human-Verified** - X/Twitter verification ensures agent ownership.

## 🏗️ Architecture

```
Human → Privy Login (X/Email) → Embedded Wallet
                ↓
        Register Agent
                ↓
    Agent gets API Key + Skills
                ↓
   Agent executes DeFi operations
```

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/caiovicentino/clawfi.git
cd clawfi

# Install
pnpm install

# Configure
cp .env.example .env.local
# Edit .env.local with your Privy keys

# Run
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000)

## 📦 Available Skills

### Jupiter (Swap Aggregator)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/jupiter/tokens` | GET | List popular tokens and mints |
| `/api/v1/jupiter/quote` | GET | Get swap quote |
| `/api/v1/jupiter/swap` | POST | Build swap transaction |

### Kamino (Lending & Vaults)

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/kamino/markets` | GET | List lending markets |
| `/api/v1/kamino/reserves` | GET | Get reserves with APY/rates |
| `/api/v1/kamino/vaults` | GET | List yield vaults |
| `/api/v1/kamino/positions` | GET | Get user positions |
| `/api/v1/kamino/deposit` | POST | Deposit/withdraw to lending |
| `/api/v1/kamino/borrow` | POST | Borrow/repay from lending |

### Wallet

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/wallet/balance` | GET | Check SOL and token balances |

## 🔧 API Examples

### Get Swap Quote
```bash
curl "https://clawfi.vercel.app/api/v1/jupiter/quote?\
inputMint=So11111111111111111111111111111111111111112&\
outputMint=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v&\
amount=1000000000"
```

### Execute Swap
```bash
curl -X POST "https://clawfi.vercel.app/api/v1/jupiter/swap" \
  -H "Content-Type: application/json" \
  -d '{
    "quoteResponse": {...},
    "userPublicKey": "YOUR_WALLET"
  }'
```

### Get Kamino Reserves
```bash
# All reserves
curl "https://clawfi.vercel.app/api/v1/kamino/reserves"

# Filter by token
curl "https://clawfi.vercel.app/api/v1/kamino/reserves?token=SOL"
```

### Get Best Yield Vaults
```bash
# All vaults
curl "https://clawfi.vercel.app/api/v1/kamino/vaults"

# Filter by token and minimum APY
curl "https://clawfi.vercel.app/api/v1/kamino/vaults?token=SOL&minApy=10"
```

### Get User Positions
```bash
curl "https://clawfi.vercel.app/api/v1/kamino/positions?wallet=YOUR_WALLET"
```

### Deposit to Lending
```bash
curl -X POST "https://clawfi.vercel.app/api/v1/kamino/deposit" \
  -H "Content-Type: application/json" \
  -d '{
    "wallet": "YOUR_WALLET",
    "reserve": "RESERVE_ADDRESS",
    "amount": "1000000000"
  }'
```

## 🛠️ Tech Stack

- **Frontend:** Next.js 16 (App Router)
- **Auth:** Privy (Embedded Wallets)
- **Styling:** Tailwind CSS
- **DeFi:** Jupiter, Kamino
- **Chain:** Solana

## 📁 Project Structure

```
clawfi/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── agents/register/      # Agent registration
│   │   │   └── v1/
│   │   │       ├── jupiter/          # Swap APIs
│   │   │       │   ├── quote/        # GET quote
│   │   │       │   ├── swap/         # POST swap tx
│   │   │       │   └── tokens/       # GET token list
│   │   │       ├── kamino/           # Lending/Vault APIs
│   │   │       │   ├── markets/      # GET markets
│   │   │       │   ├── reserves/     # GET reserves
│   │   │       │   ├── vaults/       # GET vaults
│   │   │       │   ├── positions/    # GET user positions
│   │   │       │   ├── deposit/      # POST deposit/withdraw
│   │   │       │   └── borrow/       # POST borrow/repay
│   │   │       └── wallet/           # Wallet APIs
│   │   ├── page.tsx                  # Landing/Dashboard
│   │   ├── layout.tsx                # Root layout
│   │   └── providers.tsx             # Privy provider
├── public/
│   └── skill.md                      # Agent skill file
└── README.md
```

## 🔐 Security

- All wallets are self-custodial (Privy embedded)
- Private keys never leave the user's device
- API keys are scoped per agent
- Human can revoke agent access anytime

## 🏆 Hackathon

Built for [Colosseum Agent Hackathon](https://colosseum.com/agent-hackathon) - Solana's First Hackathon for AI Agents.

## 📄 License

MIT

---

Built with 🦞 by [Caio Vicentino](https://x.com/0xCVYH) & [Major](https://x.com/0xCVYH)
