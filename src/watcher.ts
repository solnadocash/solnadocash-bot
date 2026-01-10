import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { getPendingTransfers, updateTransferStatus, expireOldTransfers, Transfer, getTransfer } from './db.js';
import { executePrivateTransfer } from './transfer.js';
import { Bot } from 'grammy';

let connection: Connection | null = null;
let botInstance: Bot | null = null;

const POLL_INTERVAL = 5000; // 5 seconds

// Queue system to prevent concurrent transfers
let isProcessing = false;
const transferQueue: Transfer[] = [];

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
      
      // Add to queue and process
      await queueTransfer(transfer);
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
      link_preview_options: { is_disabled: true } 
    });
  } catch (err) {
    console.error('Failed to notify user:', err);
  }
}

// Queue a transfer for processing
async function queueTransfer(transfer: Transfer) {
  // Check if already in queue
  if (transferQueue.some(t => t.id === transfer.id)) {
    return;
  }
  
  transferQueue.push(transfer);
  console.log(`📋 Queued transfer ${transfer.id} (queue size: ${transferQueue.length})`);
  
  // Notify user
  const queuePos = transferQueue.length;
  if (queuePos > 1) {
    await notifyUser(transfer.tgUserId, 
      `💰 Payment received! You're #${queuePos} in queue. Processing soon...`
    );
  } else {
    await notifyUser(transfer.tgUserId, `💰 Payment received! Processing your private transfer...`);
  }
  
  // Start processing if not already
  processQueue();
}

// Process transfers one at a time
async function processQueue() {
  if (isProcessing || transferQueue.length === 0) {
    return;
  }
  
  isProcessing = true;
  
  while (transferQueue.length > 0) {
    const transfer = transferQueue.shift()!;
    console.log(`🔄 Processing transfer ${transfer.id} (${transferQueue.length} remaining in queue)`);
    
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
      
      // Wait a bit between transfers to let the Merkle tree update
      if (transferQueue.length > 0) {
        console.log('⏳ Waiting 10s before next transfer...');
        await new Promise(r => setTimeout(r, 10000));
      }
      
    } catch (err: any) {
      console.error(`❌ Transfer ${transfer.id} failed:`, err.message);
      await notifyUser(transfer.tgUserId, 
        `❌ Transfer failed: ${err.message}\n\nYour funds are safe. Contact support with ID: ${transfer.id}`
      );
    }
  }
  
  isProcessing = false;
}

