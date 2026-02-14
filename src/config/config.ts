import dotenv from 'dotenv';

dotenv.config();

export const config = {
  telegramToken: process.env.TELEGRAM_BOT_TOKEN || '',
  openRouterToken: process.env.OPENROUTER_API_KEY || '',
  // АРХИВИРОВАНО: TheCocktailDB API заменён на Inshaker
  // cocktailApiUrl: process.env.COCKTAIL_API_URL || 'https://www.thecocktaildb.com/api/json/v1/1',
  dataPath: './data/users.json',
  maxIngredientsPerUser: 20,
  maxCocktailsToShow: 10,
};

if (!config.telegramToken) {
  throw new Error('TELEGRAM_BOT_TOKEN is not defined in .env file');
}
