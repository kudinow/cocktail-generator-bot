import TelegramBot from 'node-telegram-bot-api';
import StorageService from '../services/storageService';
import { getPopularIngredients, translateToEnglish, translateToRussian } from '../utils/helpers';
import { config } from '../config/config';
import { sendStart } from './startHandler';

const userStates = new Map<number, string>();

/** Строит inline-клавиатуру популярных ингредиентов с ✅ для уже выбранных */
const buildIngredientKeyboard = (userIngredients: string[]) => {
  const popularIngredients = getPopularIngredients();
  const userIngredientsLower = userIngredients.map(i => i.toLowerCase());

  return {
    inline_keyboard: [
      ...popularIngredients.slice(0, 18).reduce((rows: any[], ing, index) => {
        if (index % 3 === 0) rows.push([]);
        const isSelected = userIngredientsLower.includes(ing.ru.toLowerCase());
        rows[rows.length - 1].push({
          text: isSelected ? `✅ ${ing.ru}` : ing.ru,
          callback_data: `add_ing_${ing.ru}`
        });
        return rows;
      }, []),
      [{ text: '✍️ Ввести свой ингредиент', callback_data: 'add_custom_ingredient' }],
      [{ text: '📋 Мои ингредиенты', callback_data: 'my_ingredients' }],
      [{ text: '🔍 Найти коктейли', callback_data: 'find_cocktails' }],
      [{ text: '◀️ Назад', callback_data: 'back_to_menu' }]
    ]
  };
};

/** Текст сообщения для экрана выбора ингредиентов */
const buildIngredientMessage = (userIngredients: string[]): string => {
  if (userIngredients.length === 0) {
    return '🥃 *Выберите ингредиенты:*\n\nНажмите на ингредиент, чтобы добавить или убрать его.';
  }
  const selected = userIngredients.join(', ');
  return `🥃 *Выберите ингредиенты (${userIngredients.length}/${config.maxIngredientsPerUser}):*\n\nВыбрано: ${selected}`;
};

/** Отправляет экран выбора ингредиентов (новое сообщение) */
export const sendAddIngredient = async (bot: TelegramBot, chatId: number, userId: number, storage: StorageService) => {
  console.log(`[ADD_INGREDIENT] userId=${userId} chatId=${chatId}`);
  const user = storage.getUser(userId) || storage.createUser(userId);
  const ingredients = user.ingredients;

  if (ingredients.length >= config.maxIngredientsPerUser) {
    await bot.sendMessage(
      chatId,
      `⚠️ Достигнут лимит ингредиентов (${config.maxIngredientsPerUser}). Удалите ненужные командой /clear или через /my_ingredients`
    );
    return;
  }

  await bot.sendMessage(
    chatId,
    buildIngredientMessage(ingredients),
    {
      parse_mode: 'Markdown',
      reply_markup: buildIngredientKeyboard(ingredients)
    }
  );
};

/** Отправляет список ингредиентов пользователя */
export const sendMyIngredients = async (bot: TelegramBot, chatId: number, userId: number, storage: StorageService) => {
  console.log(`[MY_INGREDIENTS] userId=${userId} chatId=${chatId}`);
  const ingredients = storage.getIngredients(userId);

  if (ingredients.length === 0) {
    await bot.sendMessage(
      chatId,
      '📭 У вас пока нет добавленных ингредиентов.\n\nИспользуйте /add_ingredient чтобы добавить.',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Добавить ингредиент', callback_data: 'add_ingredient' }]
          ]
        }
      }
    );
    return;
  }

  let message = `📋 *Ваши ингредиенты (${ingredients.length}/${config.maxIngredientsPerUser}):*\n\n`;
  ingredients.forEach((ing, index) => {
    message += `${index + 1}. ${ing}\n`;
  });

  const keyboard = {
    inline_keyboard: [
      ...ingredients.slice(0, 10).map(ing => [{
        text: `❌ ${ing}`,
        callback_data: `remove_ing_${ing}`
      }]),
      [{ text: '➕ Добавить еще', callback_data: 'add_ingredient' }],
      [{ text: '🔍 Найти коктейли', callback_data: 'find_cocktails' }],
      [{ text: '🗑 Очистить все', callback_data: 'clear_all' }]
    ]
  };

  await bot.sendMessage(chatId, message, {
    parse_mode: 'Markdown',
    reply_markup: keyboard
  });
};

export const handleIngredients = (bot: TelegramBot, storage: StorageService) => {
  bot.onText(/\/add_ingredient/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;
    await sendAddIngredient(bot, chatId, userId, storage);
  });

  bot.onText(/\/my_ingredients/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    if (!userId) return;
    await sendMyIngredients(bot, chatId, userId, storage);
  });

  bot.onText(/\/clear/, async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;

    if (!userId) return;

    const keyboard = {
      inline_keyboard: [
        [
          { text: '✅ Да, очистить', callback_data: 'confirm_clear' },
          { text: '❌ Отмена', callback_data: 'cancel_clear' }
        ]
      ]
    };

    await bot.sendMessage(
      chatId,
      '⚠️ Вы уверены, что хотите удалить все ингредиенты?',
      { reply_markup: keyboard }
    );
  });

  bot.on('callback_query', async (query) => {
    const chatId = query.message?.chat.id;
    const userId = query.from.id;
    const data = query.data;

    if (!chatId || !data) return;

    // Обрабатываем только свои callback'и
    const ownCallbacks = [
      'add_ingredient', 'my_ingredients', 'add_custom_ingredient',
      'clear_all', 'confirm_clear', 'cancel_clear', 'back_to_menu'
    ];
    if (!ownCallbacks.includes(data) && !data.startsWith('add_ing_') && !data.startsWith('remove_ing_')) return;

    console.log(`[INGREDIENT_CB] userId=${userId} data="${data}"`);

    try {
      // --- Кнопка «Добавить ингредиент» — вызываем функцию напрямую ---
      if (data === 'add_ingredient') {
        await bot.answerCallbackQuery(query.id);
        await sendAddIngredient(bot, chatId, userId, storage);
        return;
      }

      // --- Кнопка «Мои ингредиенты» — вызываем функцию напрямую ---
      if (data === 'my_ingredients') {
        await bot.answerCallbackQuery(query.id);
        await sendMyIngredients(bot, chatId, userId, storage);
        return;
      }

      // --- Toggle ингредиента: добавить / убрать + обновить клавиатуру in-place ---
      if (data.startsWith('add_ing_')) {
        const ingredient = data.replace('add_ing_', '');
        const currentIngredients = storage.getIngredients(userId);
        const hasIngredient = currentIngredients.some(i => i.toLowerCase() === ingredient.toLowerCase());

        if (hasIngredient) {
          // Убираем ингредиент (toggle off)
          storage.removeIngredient(userId, ingredient);
          await bot.answerCallbackQuery(query.id, { text: `🗑 Убран: ${ingredient}` });
        } else {
          // Проверяем лимит
          if (currentIngredients.length >= config.maxIngredientsPerUser) {
            await bot.answerCallbackQuery(query.id, {
              text: `⚠️ Лимит ${config.maxIngredientsPerUser} ингредиентов!`
            });
            return;
          }
          // Добавляем ингредиент (toggle on)
          storage.addIngredient(userId, ingredient);
          await bot.answerCallbackQuery(query.id, { text: `✅ Добавлен: ${ingredient}` });
        }

        // Обновляем клавиатуру и текст in-place
        const updatedIngredients = storage.getIngredients(userId);
        try {
          await bot.editMessageText(
            buildIngredientMessage(updatedIngredients),
            {
              chat_id: chatId,
              message_id: query.message?.message_id,
              parse_mode: 'Markdown',
              reply_markup: buildIngredientKeyboard(updatedIngredients)
            }
          );
        } catch (editError: any) {
          // Telegram возвращает 400, если сообщение не изменилось (двойной клик)
          if (!editError?.message?.includes('message is not modified')) {
            throw editError;
          }
        }
        return;
      }

      if (data === 'add_custom_ingredient') {
        await bot.answerCallbackQuery(query.id);
        userStates.set(userId, 'awaiting_ingredient');
        await bot.sendMessage(
          chatId,
          '✍️ Введите название ингредиента:\n\nНапример: Водка, Лайм, Сахар'
        );
        return;
      }

      // --- Удаление ингредиента из «Мои ингредиенты» ---
      if (data.startsWith('remove_ing_')) {
        const ingredient = data.replace('remove_ing_', '');
        storage.removeIngredient(userId, ingredient);
        await bot.answerCallbackQuery(query.id, {
          text: `🗑 Удалён: ${ingredient}`
        });
        await sendMyIngredients(bot, chatId, userId, storage);
        return;
      }

      if (data === 'clear_all' || data === 'confirm_clear') {
        storage.clearIngredients(userId);
        await bot.answerCallbackQuery(query.id, {
          text: '🗑 Все ингредиенты удалены'
        });
        await bot.editMessageText(
          '✅ Список ингредиентов очищен!\n\nДобавьте новые ингредиенты командой /add_ingredient',
          {
            chat_id: chatId,
            message_id: query.message?.message_id,
            reply_markup: {
              inline_keyboard: [
                [{ text: '➕ Добавить ингредиент', callback_data: 'add_ingredient' }]
              ]
            }
          }
        );
        return;
      }

      if (data === 'cancel_clear') {
        await bot.answerCallbackQuery(query.id, { text: 'Отменено' });
        await bot.deleteMessage(chatId, query.message?.message_id || 0);
        return;
      }

      // --- Кнопка «Назад» — вызываем sendStart напрямую ---
      if (data === 'back_to_menu') {
        await bot.answerCallbackQuery(query.id);
        await bot.deleteMessage(chatId, query.message?.message_id || 0);
        await sendStart(bot, chatId, userId, storage);
        return;
      }
    } catch (error) {
      console.error(`[CALLBACK_ERROR] userId=${userId} data="${data}"`, error);
      try {
        await bot.answerCallbackQuery(query.id, {
          text: '❌ Произошла ошибка'
        });
      } catch (e) {
        console.error('[CALLBACK_ERROR] Не удалось вызвать answerCallbackQuery:', e);
      }
    }
  });

  bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const userId = msg.from?.id;
    const text = msg.text;

    if (!userId || !text || text.startsWith('/')) return;

    const state = userStates.get(userId);

    if (state === 'awaiting_ingredient') {
      userStates.delete(userId);

      const ingredient = text.trim();

      if (ingredient.length < 2 || ingredient.length > 50) {
        await bot.sendMessage(
          chatId,
          '⚠️ Название ингредиента должно быть от 2 до 50 символов.'
        );
        return;
      }

      storage.addIngredient(userId, ingredient);
      const ingredients = storage.getIngredients(userId);

      await bot.sendMessage(
        chatId,
        `✅ *Ингредиент добавлен!*\n\n${ingredient}\n\nВсего ингредиентов: ${ingredients.length}/${config.maxIngredientsPerUser}`,
        {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '➕ Добавить еще', callback_data: 'add_ingredient' }],
              [{ text: '📋 Мои ингредиенты', callback_data: 'my_ingredients' }],
              [{ text: '🔍 Найти коктейли', callback_data: 'find_cocktails' }]
            ]
          }
        }
      );
    }
  });
};
