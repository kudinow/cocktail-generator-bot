import TelegramBot from 'node-telegram-bot-api';
import StorageService from '../services/storageService';
import InshakerService, { InshakerRecipeWithMatch } from '../services/inshakerService';
import { InshakerRecipe } from '../types';
import {
  formatInshakerRecipe,
  formatInshakerRecipeWithMatch,
  formatInshakerCocktailsList,
} from '../utils/helpers';
import { config } from '../config/config';

const userCocktails = new Map<number, InshakerRecipeWithMatch[]>();
const userStates = new Map<number, string>();
const userNameSearchResults = new Map<number, InshakerRecipe[]>();

/** Отправляет рецепт одного коктейля (поиск по названию) */
const sendNameRecipe = async (
  bot: TelegramBot,
  chatId: number,
  recipe: InshakerRecipe,
  replyMarkup: TelegramBot.InlineKeyboardMarkup
) => {
  const recipeText = formatInshakerRecipe(recipe);

  try {
    if (recipe.image && recipe.image.startsWith('http')) {
      await bot.sendPhoto(chatId, recipe.image, {
        caption: recipeText,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    } else if (recipe.image) {
      // Если изображение относительный путь, добавляем базовый URL
      const imageUrl = `https://ru.inshaker.com${recipe.image}`;
      await bot.sendPhoto(chatId, imageUrl, {
        caption: recipeText,
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    } else {
      await bot.sendMessage(chatId, recipeText, {
        parse_mode: 'Markdown',
        reply_markup: replyMarkup,
      });
    }
  } catch (error) {
    console.error('Ошибка отправки рецепта (поиск по названию):', error);
    await bot.sendMessage(chatId, recipeText, {
      parse_mode: 'Markdown',
      reply_markup: replyMarkup,
    });
  }
};

/** Отображает результаты поиска по названию */
const displayNameSearchResults = async (
  bot: TelegramBot,
  chatId: number,
  userId: number,
  cocktails: InshakerRecipe[],
  inshakerService: InshakerService
) => {
  userNameSearchResults.set(userId, cocktails);

  if (cocktails.length === 0) {
    await bot.sendMessage(
      chatId,
      '😔 Коктейль не найден.\n\nПопробуйте другое название или проверьте правильность написания.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔎 Попробовать снова', callback_data: 'search_by_name' }],
            [{ text: '◀️ Назад', callback_data: 'back_to_menu' }],
          ],
        },
      }
    );
    return;
  }

  // Один результат — показываем рецепт сразу
  if (cocktails.length === 1) {
    const replyMarkup: TelegramBot.InlineKeyboardMarkup = {
      inline_keyboard: [
        [
          { text: '🔎 Найти другой', callback_data: 'search_by_name' },
          { text: '📋 Мои ингредиенты', callback_data: 'my_ingredients' },
        ],
        [{ text: '◀️ Назад', callback_data: 'back_to_menu' }],
      ],
    };
    await sendNameRecipe(bot, chatId, cocktails[0], replyMarkup);
    return;
  }

  // Несколько результатов — показываем список
  const limited = cocktails.slice(0, config.maxCocktailsToShow);
  let message = `🔍 Найдено коктейлей: ${cocktails.length}\n\n`;
  limited.forEach((cocktail, index) => {
    message += `${index + 1}. *${cocktail.name}*`;
    if (cocktail.category) {
      message += ` — ${cocktail.category}`;
    }
    message += `\n`;
  });
  message += `\nВыберите коктейль, чтобы посмотреть рецепт 👇`;

  const keyboard: TelegramBot.InlineKeyboardMarkup = {
    inline_keyboard: [
      ...limited.map((cocktail, index) => [
        {
          text: `${index + 1}. ${cocktail.name}`,
          callback_data: `name_recipe_${index}`,
        },
      ]),
      [
        { text: '🔎 Новый поиск', callback_data: 'search_by_name' },
        { text: '◀️ Назад', callback_data: 'back_to_menu' },
      ],
    ],
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard,
  });
};

/** Выполняет поиск коктейлей по ингредиентам и отправляет результат */
export const sendFindCocktails = async (
  bot: TelegramBot,
  chatId: number,
  userId: number,
  storage: StorageService,
  inshakerService: InshakerService
) => {
  console.log(`[FIND_COCKTAILS] userId=${userId} chatId=${chatId}`);
  const ingredients = storage.getIngredients(userId);

  if (ingredients.length === 0) {
    await bot.sendMessage(
      chatId,
      '📭 У вас нет добавленных ингредиентов!\n\nДобавьте ингредиенты командой /add\\_ingredient, чтобы найти коктейли.',
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Добавить ингредиент', callback_data: 'add_ingredient' }],
          ],
        },
      }
    );
    return;
  }

  try {
    await bot.sendChatAction(chatId, 'typing');
  } catch (e) {
    // Chat action failure should not block search
  }

  const searchingMsg = await bot.sendMessage(
    chatId,
    `🔍 Ищу коктейли с вашими ингредиентами...\n\n${ingredients.join(', ')}`
  );

  try {
    // Ингредиенты уже на русском языке в storage, используем напрямую
    const cocktails = inshakerService.findByIngredients(ingredients);
    userCocktails.set(userId, cocktails);

    await bot.deleteMessage(chatId, searchingMsg.message_id);

    if (cocktails.length === 0) {
      await bot.sendMessage(
        chatId,
        '😔 К сожалению, не найдено коктейлей с указанными ингредиентами.\n\nПопробуйте добавить другие ингредиенты!',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Добавить ингредиент', callback_data: 'add_ingredient' }],
            ],
          },
        }
      );
      return;
    }

    const message = formatInshakerCocktailsList(cocktails);
    const keyboard = {
      inline_keyboard: [
        ...cocktails.slice(0, config.maxCocktailsToShow).map((cocktail, index) => [
          {
            text: `${index + 1}. ${cocktail.name} (${cocktail.matchPercentage}%)`,
            callback_data: `show_recipe_${index}`,
          },
        ]),
        [{ text: '◀️ Назад', callback_data: 'back_to_menu' }],
      ],
    };

    await bot.sendMessage(chatId, message, {
      parse_mode: 'Markdown',
      reply_markup: keyboard,
    });
  } catch (error) {
    console.error('Ошибка поиска коктейлей:', error);
    await bot.deleteMessage(chatId, searchingMsg.message_id);
    await bot.sendMessage(
      chatId,
      '❌ Произошла ошибка при поиске коктейлей. Попробуйте позже.'
    );
  }
};

/** Предлагает пользователю ввести название коктейля */
export const sendSearchByName = async (
  bot: TelegramBot,
  chatId: number,
  userId: number
) => {
  console.log(`[SEARCH_BY_NAME] userId=${userId} chatId=${chatId}`);
  userStates.set(userId, 'awaiting_cocktail_name');

  await bot.sendMessage(
    chatId,
    '🔎 *Поиск коктейля по названию*\n\nВведите название коктейля (например: Мохито, Негрони, Маргарита):',
    { parse_mode: 'Markdown' }
  );
};

export const handleSearch = (
  bot: TelegramBot,
  storage: StorageService,
  inshakerService: InshakerService
) => {
  bot.onText(/\/find_cocktails/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;
    await sendFindCocktails(bot, chatId, userId, storage, inshakerService);
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!chatId || !data) return;

    // Обрабатываем только свои callback'и
    if (
      data !== 'find_cocktails' &&
      data !== 'search_by_name' &&
      data !== 'back_to_name_list' &&
      !data.startsWith('show_recipe_') &&
      !data.startsWith('name_recipe_')
    ) return;

    console.log(`[SEARCH_CALLBACK] userId=${userId} data="${data}"`);

    try {
      // --- Кнопка «Найти коктейли» — вызываем функцию напрямую ---
      if (data === 'find_cocktails') {
        await bot.answerCallbackQuery(query.id);
        await sendFindCocktails(bot, chatId, userId, storage, inshakerService);
        return;
      }

      // --- Кнопка «Найти по названию» ---
      if (data === 'search_by_name') {
        await bot.answerCallbackQuery(query.id);
        await sendSearchByName(bot, chatId, userId);
        return;
      }

      // --- Рецепт из результатов поиска по ингредиентам ---
      if (data.startsWith('show_recipe_')) {
        const index = parseInt(data.replace('show_recipe_', ''));
        const cocktails = userCocktails.get(userId);

        if (!cocktails || !cocktails[index]) {
          await bot.answerCallbackQuery(query.id, {
            text: '❌ Коктейль не найден. Выполните поиск заново.',
          });
          return;
        }

        const cocktail = cocktails[index];
        await bot.answerCallbackQuery(query.id);

        const recipeMarkup = {
          inline_keyboard: [
            [
              { text: '◀️ К списку', callback_data: 'find_cocktails' },
              { text: '📋 Мои ингредиенты', callback_data: 'my_ingredients' },
            ],
          ],
        };

        const recipeText = formatInshakerRecipeWithMatch(cocktail);

        try {
          if (cocktail.image) {
            const imageUrl = cocktail.image.startsWith('http')
              ? cocktail.image
              : `https://ru.inshaker.com${cocktail.image}`;

            await bot.sendPhoto(chatId, imageUrl, {
              caption: recipeText,
              parse_mode: 'Markdown',
              reply_markup: recipeMarkup,
            });
          } else {
            await bot.sendMessage(chatId, recipeText, {
              parse_mode: 'Markdown',
              reply_markup: recipeMarkup,
            });
          }
        } catch (error) {
          console.error('Ошибка отправки рецепта:', error);
          await bot.sendMessage(chatId, recipeText, {
            parse_mode: 'Markdown',
            reply_markup: recipeMarkup,
          });
        }
        return;
      }

      // --- Рецепт из результатов поиска по названию ---
      if (data.startsWith('name_recipe_')) {
        const index = parseInt(data.replace('name_recipe_', ''));
        const cocktails = userNameSearchResults.get(userId);

        if (!cocktails || !cocktails[index]) {
          await bot.answerCallbackQuery(query.id, {
            text: '❌ Коктейль не найден. Выполните поиск заново.',
          });
          return;
        }

        await bot.answerCallbackQuery(query.id);

        const replyMarkup: TelegramBot.InlineKeyboardMarkup = {
          inline_keyboard: [
            [
              { text: '◀️ К списку', callback_data: 'back_to_name_list' },
              { text: '🔎 Новый поиск', callback_data: 'search_by_name' },
            ],
            [{ text: '📋 Мои ингредиенты', callback_data: 'my_ingredients' }],
          ],
        };

        await sendNameRecipe(bot, chatId, cocktails[index], replyMarkup);
        return;
      }

      // --- Кнопка «Назад к списку» из рецепта поиска по названию ---
      if (data === 'back_to_name_list') {
        await bot.answerCallbackQuery(query.id);
        const cocktails = userNameSearchResults.get(userId);
        if (cocktails && cocktails.length > 1) {
          await displayNameSearchResults(
            bot,
            chatId,
            userId,
            cocktails,
            inshakerService
          );
        } else {
          await sendSearchByName(bot, chatId, userId);
        }
        return;
      }
    } catch (error) {
      console.error(`[CALLBACK_ERROR] userId=${userId} data="${data}"`, error);
      try {
        await bot.answerCallbackQuery(query.id, {
          text: '❌ Произошла ошибка',
        });
      } catch (e) {
        console.error('[CALLBACK_ERROR] Не удалось вызвать answerCallbackQuery:', e);
      }
    }
  });

  // --- Обработка текстового ввода для поиска по названию ---
  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text || text.startsWith('/')) return;

    const state = userStates.get(userId);
    if (state !== 'awaiting_cocktail_name') return;

    userStates.delete(userId);

    const cocktailName = text.trim();
    if (cocktailName.length < 2 || cocktailName.length > 100) {
      await bot.sendMessage(
        chatId,
        '⚠️ Название коктейля должно быть от 2 до 100 символов.'
      );
      return;
    }

    console.log(`[NAME_SEARCH] userId=${userId} name="${cocktailName}"`);

    try {
      await bot.sendChatAction(chatId, 'typing');
    } catch (e) {
      // Chat action failure should not block search
    }

    const searchMsg = await bot.sendMessage(
      chatId,
      `🔍 Ищу коктейль "${cocktailName}"...`
    );

    try {
      const cocktails = inshakerService.searchByName(cocktailName);
      await bot.deleteMessage(chatId, searchMsg.message_id);
      await displayNameSearchResults(bot, chatId, userId, cocktails, inshakerService);
    } catch (error) {
      console.error(`[NAME_SEARCH_ERROR] userId=${userId} name="${cocktailName}"`, error);
      await bot.deleteMessage(chatId, searchMsg.message_id);
      await bot.sendMessage(
        chatId,
        '❌ Произошла ошибка при поиске коктейля. Попробуйте позже.',
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔎 Попробовать снова', callback_data: 'search_by_name' }],
              [{ text: '◀️ Назад', callback_data: 'back_to_menu' }],
            ],
          },
        }
      );
    }
  });
};
