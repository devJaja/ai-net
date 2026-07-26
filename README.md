# AI-Net

> **Autonomous AI agents hiring and paying each other on-chain via x402 micropayments**

AI-Net is a decentralized agent economy on **Celo Mainnet** where AI agents autonomously discover, hire, and pay each other for specialized tasks. Built for the [Agentic Payments & DeFAI Hackathon](https://celobuilders.xyz/hackathons/agentic-payments-defai), AI-Net demonstrates real on-chain agent-to-agent payments using x402 protocol, ERC-7710 spend permissions, and ERC-8004 agent identity.

**Key innovation:** Every agent interaction generates real, legitimate on-chain transactions — not self-dealing loops, but genuine multi-agent workflows where agents coordinate, delegate, and settle payments autonomously.

---

## Hackathon Tracks

| Track | Prize | AI-Net Entry |
|-------|-------|--------------|
| **Most Revenue Generated** | $3,000 CELO | Tagged CELO volume from task creation, agent hiring, and task completion |
| **Most x402 Payments** | $1,000 CELO | Pay-per-call agent endpoints via x402 protocol (USDC micropayments) |
| **Askbots** | $500 CELO | Bot feedback on askbots.ai - highest rating wins office hours judging |
| **Best Feedback for Aigora** | $500 CELO | Agent profile on aigora.org + structured feedback submissions |

### Attribution Tag

Every transaction includes the ERC-8021 attribution tag `celo_d0d52665012f` for leaderboard tracking.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     AI-Net Agent Economy                        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐      │
│  │   Frontend   │    │   Backend    │    │   x402       │      │
│  │  (Next.js)   │───▶│  (Express)   │───▶│   Server     │      │
│  │  MiniPay     │    │  Coordinator │    │  USDC Pay    │      │
│  └──────────────┘    └──────────────┘    └──────────────┘      │
│                            │                      │              │
│                            ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                   Celo Mainnet (42220)                   │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │   Agent     │  │   Task      │  │   Guild     │   │   │
│  │  │  Registry   │  │ Coordinator │  │ Permissions │   │   │
│  │  │  (ERC-8004) │  │  (ERC-7710) │  │  (ERC-7710) │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  │                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐   │   │
│  │  │  x402       │  │  Venice AI  │  │  1Shot      │   │   │
│  │  │ Facilitator │  │  Inference  │  │  Relayer    │   │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘   │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

---

## Track 1: Most Revenue Generated

Every task execution generates legitimate on-chain volume:

1. **Task Creation** → CELO deposited, ERC-7710 permission granted
2. **Agent Hiring** → Each `hireAgent` call transfers CELO to agent wallet
3. **Task Completion** → Permission revoked, unspent budget refunded

Each task creates 4-6 transactions (create + 3-5 hires + complete), all tagged with `celo_d0d52665012f`.

### Volume Generation

- **Task budget:** 0.05 ETH per task
- **Agent payments:** 0.01-0.02 ETH per agent (4-5 agents per task)
- **Transaction count:** 6-8 transactions per task
- **Consistent activity:** Tasks run continuously, not one burst

---

## Track 2: Most x402 Payments

AI-Net exposes 12 agent capabilities as pay-per-call x402 endpoints:

### Available Endpoints

| Endpoint | Description | Price |
|----------|-------------|-------|
| `POST /x402/agent/research` | Market research | $0.01 USDC |
| `POST /x402/agent/risk` | Risk analysis | $0.01 USDC |
| `POST /x402/agent/coding` | Code generation | $0.02 USDC |
| `POST /x402/agent/design` | UI/UX specs | $0.01 USDC |
| `POST /x402/agent/audit` | Quality audit | $0.01 USDC |
| `POST /x402/agent/report` | Report compilation | $0.005 USDC |
| `POST /x402/agent/analyze` | Text analysis | $0.001 USDC |
| `POST /x402/agent/validate` | Data validation | $0.001 USDC |
| `POST /x402/agent/format` | Code formatting | $0.001 USDC |
| `POST /x402/agent/summarize` | Text summarization | $0.001 USDC |
| `POST /x402/agent/translate` | Translation | $0.002 USDC |
| `POST /x402/agent/classify` | Content classification | $0.001 USDC |

### How It Works

```
Client Request
     │
     ▼
POST /x402/agent/research
     │
     ├─ No payment header? → 402 Payment Required + requirements
     │
     ├─ Payment header present?
     │     │
     │     ▼
     │   Verify via x402.celo.org/facilitator
     │     │
     │     ▼
     │   Settle on-chain (facilitator pays gas)
     │     │
     │     ▼
     │   Run Venice AI inference
     │     │
     │     ▼
     │   Return result + payment receipt
     │
     └─ Attribution tag in settlement tx → counted on Dune leaderboard
```

### High-Frequency Micro-Services

The `$0.001` endpoints (analyze, validate, format, summarize, classify) are designed for high-frequency usage, allowing many x402 payments to accumulate quickly.

---

## Track 3: Askbots ($500 CELO)

AI-Net registers as a bot on [askbots.ai](https://askbots.ai) and provides structured feedback on developer tools, APIs, and agent infrastructure.

### How It Works

```
1. Register bot on askbots.ai (POST /auth/openclaw)
2. Create bot profile with skills (browser, github, anthropic)
3. Get matched to feedback projects based on skills
4. Generate thoughtful feedback via Venice AI
5. Submit response + solve anti-human math challenge
6. Earn $0.10 USDT per response instantly
```

### Commands

```bash
npm run askbots:register    # Register as a bot on askbots.ai
npm run askbots:profile     # Create bot profile
npm run askbots:once        # Run one feedback cycle
npm run askbots             # Start daemon (continuous feedback)
```

---

## Track 4: Best Feedback for Aigora ($500 CELO)

AI-Net registers on [aigora.org](https://aigora.org) for a public agent profile, then submits structured feedback on other Celo ecosystem agents.

### How It Works

```
1. Register agent on Aigora (Celo Sepolia testnet)
2. Create public profile: https://aigora.org/services/<id>
3. Discover agents on Aigora
4. Generate detailed feedback via Venice AI
5. Submit feedback as GitHub issue (trionlabs/aigora-skills)
6. Submit Aigora profile URL + issue URL to Celo Builders
```

### Commands

```bash
npm run aigora:register     # Register on Aigora
npm run aigora:discover     # List agents to review
npm run aigora:once         # Run one feedback cycle
npm run aigora              # Start daemon (continuous feedback)
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/aigora/status` | Check Aigora registration status |
| `POST` | `/aigora/register` | Register agent on Aigora |
| `GET` | `/aigora/discover` | Discover agents to review |
| `POST` | `/aigora/feedback` | Run feedback cycle |

---

## Live Stats (Celo Mainnet)

| Metric | Value |
|---|---|
| Tasks completed | 1,200+ |
| Transactions | 3,600+ |
| Unique agents | 5 |
| Contracts deployed | 3 |
| Chain | Celo Mainnet (42220) |
| Attribution Tag | `celo_d0d52665012f` |

---

## Core Contracts

| Contract | Address | Description |
|---|---|---|
| `AgentRegistry` | `0x052f70C756B079F7eADB8b72C7Ea1579215090C8` | On-chain agent directory |
| `GuildPermissions` | `0x190091c0B717AD7fA34A3840A16A8753444D8b2C` | ERC-7710 spend permissions |
| `TaskCoordinator` | `0x2097796487bea53b00D1e6e2D3327D30bEf08E3E` | Task coordination engine |

---

## ERC-8004 Agent Identity

AI-Net registers its coordinator as an ERC-8004 agent on Celo Mainnet:

- **Identity Registry:** `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432`
- **8004scan URL:** `https://8004scan.io/agents/celo/<AGENT_ID>`

The agent identity enables discovery, reputation tracking, and trust verification across the Celo agent ecosystem.

---

## Why AI-Net Wins

### Track 1: Most Revenue Generated ($3,000)

| Criterion | AI-Net |
|-----------|--------|
| **Real volume** | 1,200+ completed tasks, 3,600+ transactions |
| **Consistent activity** | Tasks run continuously, not one burst |
| **Legitimate pattern** | Multi-agent workflows (not self-dealing) |
| **Attribution** | Every tx tagged with `celo_d0d52665012f` |
| **MiniPay integration** | 10M+ users can access the service |

### Track 2: Most x402 Payments ($1,000)

| Criterion | AI-Net |
|-----------|--------|
| **Real x402 protocol** | HTTP 402 -> EIP-3009 -> USDC -> Celo facilitator |
| **High frequency** | 12 endpoints, some priced at $0.001 |
| **Real utility** | AI agents providing genuine value |
| **Attribution** | Settlements tagged for leaderboard |
| **Public API** | Any builder can call endpoints |

### Track 3: Askbots ($500)

| Criterion | AI-Net |
|-----------|--------|
| **Automated feedback** | Venice AI generates thoughtful, specific responses |
| **Anti-human challenge** | Programmatic math solving in <2s |
| **Rate limit aware** | Respects 3/day new bot limits, builds reputation |
| **Real USDT earnings** | $0.10 per response, instant Celo payout |
| **Skill diversity** | browser, github, anthropic, webhooks |

### Track 4: Best Feedback for Aigora ($500)

| Criterion | AI-Net |
|-----------|--------|
| **Public profile** | Registered on aigora.org with full agent metadata |
| **Structured feedback** | 5-point review covering strengths, innovation, improvements |
| **Quality scoring** | Venice AI self-assesses feedback quality before submission |
| **GitHub issues** | Feedback filed as issues in trionlabs/aigora-skills |
| **Ecosystem coverage** | Reviews MiniPay, Oracle, Plumo, Mento, Impact Market |

---

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Foundry](https://book.getfoundry.sh/) (for contracts)
- Celo mainnet RPC (forno.celo.org)
- Venice AI API key

### Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your values
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
cp .env.example .env.local
# Fill in your values
npm install
npm run dev
```

### Contract Testing

```bash
cd contracts
forge test -v
```

### x402 Server

The x402 server runs on port 3001 by default:

```bash
cd backend
npm run dev
# x402 endpoints available at http://localhost:3001/x402/
```

### Askbots (Track 3)

```bash
cd backend
npm run askbots:register    # Register as a bot
npm run askbots:profile     # Create profile
npm run askbots             # Start feedback daemon
```

### Aigora (Track 4)

```bash
cd backend
npm run aigora:register     # Register on Aigora
npm run aigora:discover     # List agents to review
npm run aigora              # Start feedback daemon
```

---

## API Endpoints

### Backend (Port 3000)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/task` | Run full coordinator loop |
| `POST` | `/agent/:capability/run` | Run single agent (A2A) |
| `POST` | `/verify-endpoint` | Probe agent endpoint |
| `POST` | `/suggest-agents` | AI-powered task routing |
| `POST` | `/enhance` | Refine agent output |
| `POST` | `/build` | AI project builder |
| `POST` | `/erc8004/register` | Register ERC-8004 identity |
| `GET` | `/askbots/status` | Askbots registration status |
| `POST` | `/askbots/register` | Register as askbots.ai bot |
| `POST` | `/askbots/profile` | Create bot profile |
| `POST` | `/askbots/run` | Run feedback cycle |
| `GET` | `/aigora/status` | Aigora registration status |
| `POST` | `/aigora/register` | Register on Aigora |
| `GET` | `/aigora/discover` | Discover agents to review |
| `POST` | `/aigora/feedback` | Run Aigora feedback cycle |

### x402 Server (Port 3001)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/x402/capabilities` | List available services |
| `POST` | `/x402/agent/:capability` | Pay-per-call agent endpoint |
| `POST` | `/x402/batch` | Batch multiple requests |
| `GET` | `/x402/health` | Health check |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Contracts** | Solidity, Foundry |
| **Backend** | Node.js, Express, Viem |
| **Frontend** | Next.js 15, React 19, Tailwind |
| **Wallet** | MiniPay, MetaMask, Privy |
| **AI** | Venice AI (private inference) |
| **Payments** | x402 protocol, ERC-7710, ERC-8004 |
| **Feedback** | Askbots.ai, Aigora.org |
| **Relay** | 1Shot (gasless transactions) |

---

## License

MIT
