import TelegramBot from 'node-telegram-bot-api';
import { config } from './config/config';
import StorageService from './services/storageService';
import CocktailService from './services/cocktailService';
import TranslationService from './services/translationService';
import { handleStart } from './handlers/startHandler';
import { handleIngredients } from './handlers/ingredientsHandler';
import { handleSearch } from './handlers/searchHandler';

const bot = new TelegramBot(config.telegramToken, { polling: true });
const storage = new StorageService(config.dataPath);
const cocktailService = new CocktailService();
const translationService = new TranslationService();

console.log('🍸 Cocktail Bot is starting...');

handleStart(bot, storage);
handleIngredients(bot, storage);
handleSearch(bot, storage, cocktailService, translationService);

bot.on('polling_error', (error) => {
  console.error('Polling error:', error);
});

bot.on('error', (error) => {
  console.error('Bot error:', error);
});

console.log('✅ Cocktail Bot is running!');
console.log('Press Ctrl+C to stop the bot');

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down bot...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Shutting down bot...');
  bot.stopPolling();
  process.exit(0);
});
