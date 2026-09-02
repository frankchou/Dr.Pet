import "dotenv/config";
import { defineConfig } from "prisma/config";

/**
 * 防呆：Prisma CLI 也不准在開發環境連遠端資料庫。
 *
 * `npx prisma migrate deploy` / `db push` / `migrate reset` / `studio` 都經過本檔，
 * 但**不經過 `src/lib/prisma.ts`**，因此那道防呆對 CLI 無效——必須在這裡再擋一次。
 * 判準與 `src/lib/env.ts` 的 `isVercelDeployment()` 相同（本檔為 CLI 設定檔，
 * 不走 `@/` 路徑別名，故就地實作同一份邏輯）。
 *
 * `npm run db:*` 已寫死 `DATABASE_URL="file:./dev.db"`，正常操作不會觸發。
 * 正式庫 migration 請用 `node scripts/migrate-turso.mjs`。
 */
function assertLocalDbInDevEnv(url: string | undefined): void {
  if (!url || url.startsWith("file:")) return;
  if (process.env.ALLOW_REMOTE_DB === "true") return;

  const vercelEnv = process.env.VERCEL_ENV;
  const isDeployment =
    vercelEnv === "production" ||
    vercelEnv === "preview" ||
    (vercelEnv !== "development" && process.env.VERCEL === "1");
  if (isDeployment) return;

  let host = "(無法解析的 DATABASE_URL)";
  try {
    const parsed = new URL(url);
    host = parsed.host ? `${parsed.protocol}//${parsed.host}` : parsed.protocol;
  } catch {
    /* 保持預設，絕不回傳原始 URL——可能含 authToken */
  }
  throw new Error(
    `[prisma.config] 開發環境的 Prisma CLI 禁止操作遠端資料庫（偵測到 ${host}）。\n` +
      `  本機請用 npm run db:migrate / db:seed / db:studio（已寫死 file:./dev.db）。\n` +
      `  正式庫 migration 請用 node scripts/migrate-turso.mjs。\n` +
      `  若確定要在本機操作正式庫，請臨時設 ALLOW_REMOTE_DB=true，用完立即移除。`,
  );
}

assertLocalDbInDevEnv(process.env["DATABASE_URL"]);

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "jiti prisma/seed.ts",
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
