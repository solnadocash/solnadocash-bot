// Load env FIRST before any other imports
import { config } from 'dotenv';
config();

import { Bot } from 'grammy';
import { setupCommands } from './commands/index.js';
import { setupPaymentWatcher } from './watcher.js';

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required in .env');
}

// Create bot instance
const bot = new Bot(BOT_TOKEN);

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

