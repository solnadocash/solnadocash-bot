import { Context } from 'grammy';

export async function startCommand(ctx: Context) {
  await ctx.reply(
`🌪️ *Welcome to Solnado Cash Bot*

Send SOL privately to any wallet. No on-chain link between you and the recipient.

*How to use:*
1️⃣ Use /send <amount> <address>
2️⃣ Send SOL to the temp wallet we provide
3️⃣ We shield and deliver privately

*Example:*
\`/send 0.5 FG7qdt3yeurMEA2mcc3Dd1KGQT4xzhqfh1o9wKmYQNZQ\`

*Commands:*
/send - Start a private transfer
/fees - View fee breakdown
/help - Show help

⚠️ Don't send to exchange wallets!`,
    { parse_mode: 'Markdown' }
  );
}

