import { Context } from 'grammy';
import { getTransfer } from '../db.js';

export async function statusCommand(ctx: Context) {
  const text = ctx.message?.text || '';
  const parts = text.split(' ').filter(p => p.trim());
  
  if (parts.length !== 2) {
    await ctx.reply(
      '❌ *Usage:* `/status <transfer_id>`\n\n' +
      '*Example:* `/status abc123`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const transferId = parts[1];
  const transfer = getTransfer(transferId);

  if (!transfer) {
    await ctx.reply('❌ Transfer not found');
    return;
  }

  const statusEmoji: Record<string, string> = {
    pending: '⏳',
    deposited: '💰',
    shielding: '🔒',
    withdrawing: '📤',
    complete: '✅',
    failed: '❌',
    expired: '⌛'
  };

  const emoji = statusEmoji[transfer.status] || '❓';

  await ctx.reply(
`${emoji} *Transfer Status*

*ID:* \`${transfer.id}\`
*Amount:* ${transfer.amount} SOL
*Recipient:* \`${transfer.recipient.slice(0, 8)}...${transfer.recipient.slice(-8)}\`
*Status:* ${transfer.status.toUpperCase()}
${transfer.withdrawTx ? `*TX:* [View on Solscan](https://solscan.io/tx/${transfer.withdrawTx})` : ''}`,
    { parse_mode: 'Markdown', disable_web_page_preview: true }
  );
}

