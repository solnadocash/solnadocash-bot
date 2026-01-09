import { Context } from 'grammy';
import { PublicKey, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { createTransfer, getTransfer } from '../db';

export async function sendCommand(ctx: Context) {
  const text = ctx.message?.text || '';
  const parts = text.split(' ').filter(p => p.trim());
  
  // Parse: /send <amount> <address>
  if (parts.length !== 3) {
    await ctx.reply(
      '❌ *Usage:* `/send <amount> <address>`\n\n' +
      '*Example:* `/send 0.5 FG7qdt...`',
      { parse_mode: 'Markdown' }
    );
    return;
  }

  const amount = parseFloat(parts[1]);
  const recipient = parts[2];

  // Validate amount
  if (isNaN(amount) || amount < 0.02) {
    await ctx.reply('❌ Minimum amount is 0.02 SOL');
    return;
  }

  if (amount > 100) {
    await ctx.reply('❌ Maximum amount is 100 SOL per transfer');
    return;
  }

  // Validate recipient address
  try {
    new PublicKey(recipient);
  } catch {
    await ctx.reply('❌ Invalid Solana address');
    return;
  }

  // Generate temp wallet
  const tempKeypair = Keypair.generate();
  const tempAddress = tempKeypair.publicKey.toBase58();
  const tempSecret = bs58.encode(tempKeypair.secretKey);

  // Calculate fees
  const fixedFee = 0.007;
  const variableFee = amount * 0.0035;
  const totalFee = fixedFee + variableFee;
  const recipientGets = amount - totalFee;

  // Create transfer in database
  const transferId = createTransfer({
    odUserId: ctx.from?.id || 0,
    odUserName: ctx.from?.username || 'unknown',
    amount,
    recipient,
    tempAddress,
    tempSecret,
    status: 'pending'
  });

  await ctx.reply(
`🌪️ *Private Transfer Initiated*

*Send exactly:* \`${amount} SOL\`
*To address:* \`${tempAddress}\`

*Recipient gets:* ~${recipientGets.toFixed(4)} SOL
*Fee:* ~${totalFee.toFixed(4)} SOL (~${(totalFee/amount*100).toFixed(1)}%)

⏳ Waiting for your deposit...
📝 Transfer ID: \`${transferId}\`

_Send SOL within 30 minutes_

⚠️ Send the EXACT amount shown above!`,
    { parse_mode: 'Markdown' }
  );
}

