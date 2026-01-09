import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import { Transfer, updateTransferStatus } from './db';
import { PrivacyCash } from 'privacycash';

function getRpcUrl() {
  return process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
}

function getRelayerKey() {
  return process.env.RELAYER_KEY;
}

let connection: Connection;

export async function executePrivateTransfer(transfer: Transfer): Promise<void> {
  console.log(`🔄 Executing private transfer ${transfer.id}`);
  
  // Initialize connection if not already
  if (!connection) {
    connection = new Connection(getRpcUrl(), 'confirmed');
  }
  
  try {
    // Reconstruct temp wallet keypair
    const tempKeypair = Keypair.fromSecretKey(bs58.decode(transfer.tempSecret));
    
    // Get relayer keypair
    const relayerKey = getRelayerKey();
    if (!relayerKey) throw new Error('RELAYER_KEY not configured');
    const relayerKeypair = Keypair.fromSecretKey(bs58.decode(relayerKey));
    
    // 1. Sweep temp wallet to relayer
    updateTransferStatus(transfer.id, 'shielding');
    
    const tempBalance = await connection.getBalance(tempKeypair.publicKey);
    const sweepAmount = tempBalance - 5000; // Leave some for fees
    
    if (sweepAmount <= 0) {
      throw new Error('Insufficient balance in temp wallet');
    }
    
    const sweepTx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: tempKeypair.publicKey,
        toPubkey: relayerKeypair.publicKey,
        lamports: sweepAmount
      })
    );
    
    const sweepSig = await sendAndConfirmTransaction(connection, sweepTx, [tempKeypair]);
    console.log(`  Swept to relayer: ${sweepSig}`);
    
    // 2. Calculate amounts
    const RELAYER_FEE = 1_000_000; // 0.001 SOL
    const depositAmount = sweepAmount - RELAYER_FEE;
    
    // 3. Initialize PrivacyCash and execute deposit + withdraw
    console.log(`  Depositing ${depositAmount} lamports to shielded pool...`);
    
    const privacyCash = new PrivacyCash({
      RPC_url: getRpcUrl(),
      owner: Array.from(relayerKeypair.secretKey),
      enableDebug: true
    });
    
    // Deposit to pool
    await privacyCash.deposit({ lamports: depositAmount });
    console.log(`  Deposit complete, waiting for pool update...`);
    
    // Wait for pool update
    await new Promise(r => setTimeout(r, 8000));
    
    // Get pool balance
    updateTransferStatus(transfer.id, 'withdrawing');
    const balance = await privacyCash.getPrivateBalance();
    let poolBalance: number;
    if (typeof balance === 'object' && balance !== null) {
      poolBalance = (balance as any).lamports || depositAmount;
    } else {
      poolBalance = balance as number || depositAmount;
    }
    
    console.log(`  Pool balance: ${poolBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Withdrawing to ${transfer.recipient}...`);
    
    // Withdraw to recipient
    const withdrawResult = await privacyCash.withdraw({
      lamports: poolBalance,
      recipientAddress: transfer.recipient
    });
    
    const txSig = (withdrawResult as any)?.tx || (withdrawResult as any)?.signature || 'unknown';
    updateTransferStatus(transfer.id, 'complete', { withdraw: txSig });
    console.log(`✅ Transfer ${transfer.id} complete: ${txSig}`);
    
  } catch (err: any) {
    console.error(`❌ Transfer ${transfer.id} failed:`, err.message);
    updateTransferStatus(transfer.id, 'failed');
  }
}

