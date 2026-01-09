// Load env FIRST before any other imports
import { config } from 'dotenv';
config();

import { Bot, Context, session } from 'grammy';
import { setupCommands } from './commands';
import { setupPaymentWatcher } from './watcher';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required in .env');
}

// Create bot instance
const bot = new Bot(BOT_TOKEN);

// Session middleware for tracking user state
interface SessionData {
  pendingTransfer?: {
    amount: number;
    recipient: string;
    tempWallet: string;
    sessionId: string;
    createdAt: number;
  };
}

bot.use(session({
  initial: (): SessionData => ({})
}));

// Setup commands
setupCommands(bot);

// Error handling
bot.catch((err) => {
  console.error('Bot error:', err);
});

// Start bot
console.log('🤖 Solnado Cash Bot starting...');
bot.start();
console.log('✅ Bot is running!');

// Start payment watcher with bot instance for notifications
setupPaymentWatcher(bot);

