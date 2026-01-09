import { Context } from 'grammy';

export async function helpCommand(ctx: Context) {
  await ctx.reply(
`🆘 *Solnado Cash Help*

*Commands:*
/start - Welcome message
/send <amount> <address> - Start private transfer
/status <id> - Check transfer status
/fees - View fee breakdown
/help - This message

*How it works:*
1. You request a private send
2. We give you a temp deposit address
3. You send SOL to that address
4. We shield your funds in a privacy pool
5. Recipient gets funds with no link to you

*Example:*
\`/send 1 FG7qdt3yeurMEA2mcc3Dd1KGQT4xzhqfh1o9wKmYQNZQ\`

*Support:*
Twitter: @solnadocash
Website: solnadocash.com

⚠️ *Important:*
• Minimum: 0.02 SOL
• Don't use exchange wallets as recipient
• Transfers take ~30-60 seconds`,
    { parse_mode: 'Markdown' }
  );
}

