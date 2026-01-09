// Refund script for failed transfers
import { config } from 'dotenv';
config();

import { Connection, Keypair, PublicKey, LAMPORTS_PER_SOL, Transaction, SystemProgram, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import Database from 'better-sqlite3';

const db = new Database('transfers.db');
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';
const RELAYER_KEY = process.env.RELAYER_KEY;

if (!RELAYER_KEY) {
  console.error('❌ RELAYER_KEY not set');
  process.exit(1);
}

const connection = new Connection(RPC_URL, 'confirmed');
const relayerKeypair = Keypair.fromSecretKey(bs58.decode(RELAYER_KEY));

async function main() {
  console.log('🔍 Finding failed transfers...\n');
  
  // Get failed transfers
  const failed = db.prepare(
    "SELECT id, amount, recipient, tg_username FROM transfers WHERE status = 'failed'"
  ).all() as any[];
  
  if (failed.length === 0) {
    console.log('✅ No failed transfers to refund!');
    return;
  }
  
  console.log(`Found ${failed.length} failed transfer(s):\n`);
  
  // Check relayer balance
  const relayerBalance = await connection.getBalance(relayerKeypair.publicKey);
  console.log(`Relayer balance: ${relayerBalance / LAMPORTS_PER_SOL} SOL\n`);
  
  for (const tx of failed) {
    // Calculate refund amount (original amount minus fees that were already taken)
    // The user sent X SOL, we swept X - 0.000005 (rent), kept 0.001 (relayer fee)
    // So refund is approximately: amount - 0.001005
    const refundAmount = Math.floor((tx.amount - 0.001) * LAMPORTS_PER_SOL);
    
    console.log(`Transfer ID: ${tx.id}`);
    console.log(`  User: @${tx.tg_username || 'unknown'}`);
    console.log(`  Original amount: ${tx.amount} SOL`);
    console.log(`  Refund amount: ${refundAmount / LAMPORTS_PER_SOL} SOL`);
    console.log(`  Recipient: ${tx.recipient}`);
    console.log('');
  }
  
  // Ask for confirmation
  console.log('To refund, run with --execute flag');
  console.log('Example: npx tsx src/refund.ts --execute');
  
  if (process.argv.includes('--execute')) {
    console.log('\n🚀 Executing refunds...\n');
    
    for (const tx of failed) {
      try {
        const refundAmount = Math.floor((tx.amount - 0.001) * LAMPORTS_PER_SOL);
        
        const refundTx = new Transaction().add(
          SystemProgram.transfer({
            fromPubkey: relayerKeypair.publicKey,
            toPubkey: new PublicKey(tx.recipient),
            lamports: refundAmount
          })
        );
        
        const sig = await sendAndConfirmTransaction(connection, refundTx, [relayerKeypair]);
        console.log(`✅ Refunded ${tx.id}: ${sig}`);
        
        // Update status to refunded
        db.prepare("UPDATE transfers SET status = 'refunded' WHERE id = ?").run(tx.id);
        
      } catch (err: any) {
        console.error(`❌ Failed to refund ${tx.id}: ${err.message}`);
      }
    }
    
    console.log('\n✅ Refunds complete!');
  }
}

main().catch(console.error);

