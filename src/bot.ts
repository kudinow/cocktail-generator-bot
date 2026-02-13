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

console.log('🍸 Запуск Cocktail Bot...');

handleStart(bot, storage);
handleIngredients(bot, storage);
handleSearch(bot, storage, cocktailService, translationService);

bot.on('polling_error', (error) => {
  console.error('Ошибка polling:', error);
});

bot.on('error', (error) => {
  console.error('Ошибка бота:', error);
});

console.log('✅ Cocktail Bot запущен!');
console.log('Нажмите Ctrl+C для остановки бота');

process.on('SIGINT', () => {
  console.log('\n👋 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n👋 Остановка бота...');
  bot.stopPolling();
  process.exit(0);
});
