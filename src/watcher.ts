import { Connection, PublicKey, LAMPORTS_PER_SOL, Keypair } from '@solana/web3.js';
import bs58 from 'bs58';
import { getPendingTransfers, updateTransferStatus, expireOldTransfers, Transfer } from './db';
import { executePrivateTransfer } from './transfer';

const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const connection = new Connection(RPC_URL, 'confirmed');

const POLL_INTERVAL = 5000; // 5 seconds

export function setupPaymentWatcher() {
  console.log('👀 Payment watcher started');
  
  setInterval(async () => {
    try {
      // Expire old pending transfers
      expireOldTransfers();
      
      // Get pending transfers
      const pending = getPendingTransfers();
      
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
    const balance = await connection.getBalance(new PublicKey(transfer.tempAddress));
    const balanceSOL = balance / LAMPORTS_PER_SOL;
    
    // Check if payment received (with small tolerance for fees)
    const expectedMin = transfer.amount * 0.99; // Allow 1% tolerance
    
    if (balanceSOL >= expectedMin) {
      console.log(`💰 Payment detected for ${transfer.id}: ${balanceSOL} SOL`);
      
      updateTransferStatus(transfer.id, 'deposited');
      
      // Execute the private transfer
      await executePrivateTransfer(transfer);
    }
  } catch (err) {
    console.error(`Error checking payment for ${transfer.id}:`, err);
  }
}

