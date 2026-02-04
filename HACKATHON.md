# 🏆 SolSkill — Hackathon Submission

## Project Info

| Field | Value |
|-------|-------|
| **Name** | SolSkill |
| **Tagline** | DeFi Skills for AI Agents |
| **Demo** | [https://solskill.ai](https://solskill.ai) |
| **Skill Spec** | [https://solskill.ai/skill.md](https://solskill.ai/skill.md) |
| **Category** | AI + DeFi Infrastructure |

---

## 🎯 Problem

**AI agents can't do DeFi.**

Current AI assistants (Claude, GPT, Llama, etc.) can analyze markets, suggest strategies, and explain protocols—but they can't execute. The moment you ask an agent to actually *trade*, *lend*, or *stake*, it hits a wall:

- ❌ **No wallet access** — Agents have no way to hold or move funds
- ❌ **Custody concerns** — Sharing keys with an AI is a security nightmare
- ❌ **No human oversight** — Autonomous financial operations need guardrails
- ❌ **No standard interface** — Each protocol requires custom integration

This creates friction for users who want AI-powered automation and limits what autonomous agents can actually accomplish.

---

## 💡 Solution

**SolSkill = DeFi superpowers for any AI agent.**

We built a **skill layer** that:

1. **Creates self-custodial wallets** for each agent (via Privy embedded wallets)
2. **Exposes a simple API** for swaps, lending, vaults, and more
3. **Enables human oversight** through a claim verification system
4. **Works with any AI** — just give it the skill spec at `solskill.ai/skill.md`

### How It Works

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  AI Agent   │────▶│  SolSkill   │────▶│   Solana    │
│             │     │  skill.md   │     │    DeFi     │
│  "Swap 1    │     │             │     │             │
│   SOL for   │     │  Translates │     │  Jupiter    │
│   USDC"     │     │  to API     │     │  Kamino     │
│             │     │  calls      │     │  Raydium    │
└─────────────┘     └─────────────┘     └─────────────┘
```

### The Claim Flow

1. **Agent registers itself** → Gets wallet address + claim code
2. **Human visits claim URL** → Connects wallet, verifies identity
3. **Human approves agent** → Agent receives API key
4. **Agent operates autonomously** → Human can monitor via dashboard

This balances autonomy with oversight. The agent can work independently, but a human remains in control.

---

## 🚀 Innovation / Differentiators

### 1. **Agent Self-Registration**
Agents can create their own wallets programmatically—no human needed for setup. This enables true autonomous operation while maintaining security through the claim flow.

### 2. **Skill Spec Standard**
We publish a machine-readable skill specification at `/skill.md`. Any AI that can read markdown can discover and use SolSkill. No custom plugins or integrations needed.

### 3. **Multi-Protocol Aggregation**
Single API that combines:
- **Jupiter** for best-price swaps
- **Kamino** for lending and yield vaults
- **Raydium** for liquidity provision

Agents don't need to know protocol-specific details.

### 4. **Human-in-the-Loop Security**
The claim system creates an accountability chain:
- Agent can only operate after human approval
- All transactions are logged and visible
- Human can revoke access anytime

### 5. **Real-Time Dashboard**
Full visibility into:
- Agent activity and transactions
- Portfolio positions and health
- Limit orders and alerts

---

## 📊 Impact Potential

### For AI Developers
- Drop-in DeFi capabilities for any agent
- No wallet infrastructure to build
- Focus on strategy, not plumbing

### For DeFi Users
- AI-powered portfolio management
- Automated yield optimization
- 24/7 monitoring and rebalancing

### For the Ecosystem
- Standard interface for AI ↔ DeFi
- More agents = more volume = more liquidity
- Blueprint for safe AI financial autonomy

### Metrics We're Tracking
- Agents registered
- Total value managed
- Successful transactions
- Protocol diversity (swaps vs lending vs LP)

---

## 🔮 Roadmap / Next Steps

### Short Term (1-3 months)
- [ ] Multi-sig support for high-value operations
- [ ] More protocols (Drift, Marginfi, Orca)
- [ ] Agent-to-agent communication
- [ ] Mobile dashboard app

### Medium Term (3-6 months)
- [ ] Strategy marketplace (agents share strategies)
- [ ] Risk scoring for agent operations
- [ ] Cross-chain support (EVM via Wormhole)
- [ ] SDK for popular agent frameworks (LangChain, AutoGPT)

### Long Term (6+ months)
- [ ] Decentralized skill registry
- [ ] Agent reputation system
- [ ] DAO governance for protocol selection
- [ ] Native token for gas abstraction

---

## 🏗️ Technical Implementation

### Stack
| Component | Technology |
|-----------|------------|
| Frontend | Next.js 15, React 19, TailwindCSS |
| Auth | Privy (Embedded Wallets) |
| Blockchain | Solana (Mainnet) |
| Protocols | Jupiter, Kamino, Raydium |
| Deploy | Vercel |

### Key Technical Decisions

**Why Privy?**
- Embedded wallets = one wallet per agent
- No key management headaches
- Bank-grade security (HSM-backed)
- Easy claim flow for human verification

**Why Skill Spec?**
- Agents can self-discover capabilities
- No API documentation to parse
- Works with prompt-based AI systems
- Version control for capability changes

**Why Solana?**
- Fast finality (< 1s)
- Low fees (~$0.001/tx)
- Rich DeFi ecosystem
- Growing AI agent activity

---

## 👥 Team

Solo developer: **Caio Vicentino** (@0xCVYH)

- Building at the intersection of AI and crypto
- Previously: [relevant experience]
- Twitter: [@0xCVYH](https://twitter.com/0xCVYH)

---

## 📝 Submission Checklist

- [x] Live demo deployed
- [x] Skill spec published
- [x] README documentation
- [x] Working agent registration
- [x] Jupiter swaps functional
- [x] Kamino lending functional
- [x] Raydium integration
- [x] Dashboard for monitoring
- [x] Claim verification flow

---

## 🔗 Links

| Resource | URL |
|----------|-----|
| **Live Demo** | [https://solskill.ai](https://solskill.ai) |
| **Skill Spec** | [https://solskill.ai/skill.md](https://solskill.ai/skill.md) |
| **GitHub** | [this repo] |
| **Twitter** | [@0xCVYH](https://twitter.com/0xCVYH) |

---

<p align="center">
  <strong>🛠️ SolSkill — Because your AI deserves a wallet too.</strong>
</p>
