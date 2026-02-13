import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  openRouterToken: process.env.OPENROUTER_API_KEY || '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',
  cocktailApiUrl: process.env.COCKTAIL_API_URL || 'https://www.thecocktaildb.com/api/json/v1/1',
  dataPath: './data/users.json',
  maxIngredientsPerUser: 20,
  maxCocktailsToShow: 10,
};

if (!config.telegramToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env file');
}
