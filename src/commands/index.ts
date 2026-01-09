import { Bot, Context } from 'grammy';
import { startCommand } from './start';
import { sendCommand } from './send';
import { statusCommand } from './status';
import { feesCommand } from './fees';
import { helpCommand } from './help';

export function setupCommands(bot: Bot) {
  bot.command('start', startCommand);
  bot.command('send', sendCommand);
  bot.command('status', statusCommand);
  bot.command('fees', feesCommand);
  bot.command('help', helpCommand);
}

