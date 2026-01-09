# Solnado Cash Bot 🤖

Telegram bot for private SOL transfers on Solana.

## How It Works

```
User: /send 0.5 <recipient_address>
         ↓
Bot: "Send 0.5 SOL to this address: [temp_wallet]"
         ↓
User sends SOL to temp wallet
         ↓
Bot detects payment → shields → withdraws privately
         ↓
Bot: "✅ Sent! Recipient received ~0.465 SOL"
```

## Commands

| Command | Description |
|---------|-------------|
| `/start` | Welcome + instructions |
| `/send <amount> <address>` | Start private transfer |
| `/status <id>` | Check transfer status |
| `/fees` | Show fee breakdown |
| `/help` | Show all commands |

## Features

- 🔒 **Private transfers** - No on-chain link between sender and recipient
- 📱 **Simple UX** - Just send a command, no wallet connection needed
- ⚡ **Fast** - Transfers complete in ~30 seconds
- 💰 **Low fees** - ~0.007 SOL + 0.35%

## Fee Structure

| Amount | Total Fee | Recipient Gets |
|--------|-----------|----------------|
| 0.1 SOL | ~0.0074 SOL (~7.4%) | ~0.0926 SOL |
| 0.5 SOL | ~0.0088 SOL (~1.8%) | ~0.4912 SOL |
| 1 SOL | ~0.0105 SOL (~1.1%) | ~0.9895 SOL |
| 5 SOL | ~0.0245 SOL (~0.5%) | ~4.9755 SOL |

## Tech Stack

- **Runtime:** Node.js + TypeScript
- **Bot Framework:** grammY
- **Blockchain:** Solana + PrivacyCash SDK
- **Database:** SQLite (for session tracking)

## Development

```bash
# Clone
git clone https://github.com/solnadocash/solnadocash-bot.git
cd solnadocash-bot

# Install
npm install

# Configure
cp .env.example .env
# Edit .env with your keys

# Run
npm run dev
```

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `BOT_TOKEN` | Yes | Telegram bot token from @BotFather |
| `RELAYER_KEY` | Yes | Base58 private key for relayer wallet |
| `RPC_URL` | No | Solana RPC (default: mainnet) |

## ⚠️ Important

- Don't send to exchange wallets (Binance, Coinbase, etc.)
- Minimum transfer: 0.02 SOL
- Recipient must be a personal wallet

## Links

- Website: [solnadocash.com](https://solnadocash.com)
- Twitter: [@solnadocash](https://x.com/solnadocash)
- Main Repo: [solnadocash/solnado](https://github.com/solnadocash/solnado)

## License

MIT

