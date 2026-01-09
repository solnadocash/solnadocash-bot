import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { getPendingTransfers, updateTransferStatus, expireOldTransfers, Transfer, getTransfer } from './db.js';
import { executePrivateTransfer } from './transfer.js';
import { Bot } from 'grammy';

let connection: Connection | null = null;
let botInstance: Bot | null = null;

const POLL_INTERVAL = 5000; // 5 seconds

export function setupPaymentWatcher(bot?: Bot) {
  if (bot) botInstance = bot;
  console.log('👀 Payment watcher started');
  
  setInterval(async () => {
    try {
      // Expire old pending transfers
      expireOldTransfers();
      
      // Get pending transfers
      const pending = getPendingTransfers();
      
      if (pending.length > 0) {
        console.log(`🔍 Checking ${pending.length} pending transfer(s)...`);
      }
      
      for (const transfer of pending) {
        await checkTransferPayment(transfer);
      }
    } catch (err) {
      console.error('Watcher error:', err);
    }
  }, POLL_INTERVAL);
}

async function checkTransferPayment(transfer: Transfer) {
  try {
    console.log(`  Checking ${transfer.tempAddress.slice(0, 8)}... (expecting ${transfer.amount} SOL)`);
    
    if (!connection) {
      connection = new Connection(process.env.RPC_URL || 'https://api.mainnet-beta.solana.com', 'confirmed');
    }
    
    const balance = await connection.getBalance(new PublicKey(transfer.tempAddress));
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    console.log(`  Balance: ${balanceSOL} SOL`);
    
    // Check if payment received (with small tolerance for fees)
    const expectedMin = transfer.amount * 0.99; // Allow 1% tolerance
    
    if (balanceSOL >= expectedMin) {
      console.log(`💰 Payment detected for ${transfer.id}: ${balanceSOL} SOL`);
      
      updateTransferStatus(transfer.id, 'deposited');
      
      // Notify user that payment received
      await notifyUser(transfer.tgUserId, `💰 Payment received! Processing your private transfer...`);
      
      // Execute the private transfer
      try {
        await executePrivateTransfer(transfer);
        
        // Get updated transfer with TX
        const updated = getTransfer(transfer.id);
        const txLink = updated?.withdrawTx 
          ? `\n\n[View on Solscan](https://solscan.io/tx/${updated.withdrawTx})`
          : '';
        
        await notifyUser(transfer.tgUserId, 
          `✅ *Private transfer complete!*\n\n` +
          `Sent: ${transfer.amount} SOL\n` +
          `To: \`${transfer.recipient.slice(0, 8)}...${transfer.recipient.slice(-8)}\`${txLink}`
        );
      } catch (err: any) {
        await notifyUser(transfer.tgUserId, 
          `❌ Transfer failed: ${err.message}\n\nContact support with ID: ${transfer.id}`
        );
      }
    }
  } catch (err) {
    console.error(`Error checking payment for ${transfer.id}:`, err);
  }
}

async function notifyUser(userId: number, message: string) {
  if (!botInstance || !userId) return;
  try {
    await botInstance.api.sendMessage(userId, message, { 
      parse_mode: 'Markdown',
      disable_web_page_preview: true 
    });
  } catch (err) {
    console.error('Failed to notify user:', err);
  }
}

