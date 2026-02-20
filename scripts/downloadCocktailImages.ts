import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

const RECIPES_PATH = path.join(__dirname, "../data/inshaker_recipes.json");
const OUTPUT_DIR = path.join(__dirname, "../web/public/cocktail-images");
const BASE_URL = "https://ru.inshaker.com";
const DELAY_MS = 300;

interface Recipe {
  id: number;
  name: string;
  image: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const client = url.startsWith("https") ? https : http;

    const cleanup = (err?: Error) => {
      file.close();
      fs.unlink(dest, () => {});
      if (err) reject(err);
    };

    client
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          file.close();
          const redirectUrl = response.headers.location!;
          downloadFile(redirectUrl, dest).then(resolve).catch(reject);
          return;
        }
        if (response.statusCode !== 200) {
          cleanup(new Error(`HTTP ${response.statusCode}`));
          return;
        }
        response.pipe(file);
        file.on("finish", () => {
          file.close();
          resolve();
        });
      })
      .on("error", cleanup);
  });
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const recipes: Recipe[] = JSON.parse(fs.readFileSync(RECIPES_PATH, "utf-8"));
  console.log(`\nЗагружено ${recipes.length} рецептов из базы`);
  console.log(`Сохраняем изображения в: ${OUTPUT_DIR}\n`);

  let downloaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const recipe of recipes) {
    const destPath = path.join(OUTPUT_DIR, `${recipe.id}.jpg`);

    if (fs.existsSync(destPath)) {
      skipped++;
      continue;
    }

    if (!recipe.image) {
      console.log(`⚠️  ${recipe.name} (ID ${recipe.id}): нет изображения`);
      failed++;
      continue;
    }

    const url = `${BASE_URL}${recipe.image}`;
    try {
      await downloadFile(url, destPath);
      downloaded++;
      console.log(`✅ [${downloaded + skipped}/${recipes.length}] ${recipe.name}`);
    } catch (err) {
      failed++;
      console.log(`❌ ${recipe.name} (ID ${recipe.id}): ${err}`);
    }

    await sleep(DELAY_MS);
  }

  console.log(`\n✨ Готово!`);
  console.log(`   ✅ Скачано: ${downloaded}`);
  console.log(`   ⏭️  Пропущено (уже есть): ${skipped}`);
  console.log(`   ❌ Ошибок: ${failed}`);
}

main().catch(console.error);
