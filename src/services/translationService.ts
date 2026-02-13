import axios from 'axios';
import { config } from '../config/config';

interface OpenRouterMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

class TranslationService {
  private apiUrl = 'https://openrouter.ai/api/v1/chat/completions';
  private apiKey: string;
  private cache: Map<string, string> = new Map();

  constructor() {
    this.apiKey = config.openRouterToken;
  }

  /**
   * Переводит текст через OpenRouter API
   */
  private async translate(text: string, fromLang: string, toLang: string): Promise<string> {
    const cacheKey = `${fromLang}-${toLang}-${text.toLowerCase()}`;

    // Проверяем кэш
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    try {
      const messages: OpenRouterMessage[] = [
        {
          role: 'system',
          content: `You are a professional translator. Translate the text from ${fromLang} to ${toLang}. Return ONLY the translation, without any additional text, explanations, or formatting.`
        },
        {
          role: 'user',
          content: text
        }
      ];

      const response = await axios.post<OpenRouterResponse>(
        this.apiUrl,
        {
          model: 'openai/gpt-3.5-turbo',
          messages
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://github.com/cocktail-bot',
            'X-Title': 'Cocktail Bot'
          }
        }
      );

      const translatedText = response.data.choices[0]?.message?.content?.trim() || text;

      // Сохраняем в кэш
      this.cache.set(cacheKey, translatedText);

      return translatedText;
    } catch (error) {
      console.error('Translation error:', error);
      return text; // Возвращаем исходный текст при ошибке
    }
  }

  /**
   * Переводит название коктейля с русского на английский
   */
  async translateToEnglish(russianName: string): Promise<string> {
    return this.translate(russianName, 'Russian', 'English');
  }

  /**
   * Переводит текст с английского на русский
   */
  async translateToRussian(englishText: string): Promise<string> {
    return this.translate(englishText, 'English', 'Russian');
  }

  /**
   * Переводит несколько текстов одновременно (для оптимизации)
   */
  async translateBatchToRussian(englishTexts: string[]): Promise<string[]> {
    const uniqueTexts = [...new Set(englishTexts)];
    const translations = await Promise.all(
      uniqueTexts.map(text => this.translateToRussian(text))
    );

    const translationMap = new Map<string, string>();
    uniqueTexts.forEach((text, index) => {
      translationMap.set(text, translations[index]);
    });

    return englishTexts.map(text => translationMap.get(text) || text);
  }

  /**
   * Очищает кэш переводов
   */
  clearCache(): void {
    this.cache.clear();
  }
}

export default TranslationService;
