-- 飲食頁產品卡片「錯誤回報」：新增 ProductErrorReport 表，記錄使用者回報的產品資料問題。
--   productId : 關聯 Product，產品刪除時 cascade 一併刪除回報。
--   userId    : 回報者；note 為選填說明；status 預設 pending。
-- 本機已套用（sqlite3 / prisma db execute + migrate resolve --applied，避免 reset 清空 dev 資料）。
-- 正式環境（Turso）請於部署流程跑 `prisma migrate deploy`（新增表，對既有資料無破壞性）。
-- CreateTable
CREATE TABLE "ProductErrorReport" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ProductErrorReport_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
