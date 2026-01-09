import { Bot, Context } from 'grammy';
import { startCommand } from './start.js';
import { sendCommand } from './send.js';
import { statusCommand } from './status.js';
import { feesCommand } from './fees.js';
import { helpCommand } from './help.js';

export function setupCommands(bot: Bot) {
  bot.command('start', startCommand);
  bot.command('send', sendCommand);
  bot.command('status', statusCommand);
  bot.command('fees', feesCommand);
  bot.command('help', helpCommand);
}

