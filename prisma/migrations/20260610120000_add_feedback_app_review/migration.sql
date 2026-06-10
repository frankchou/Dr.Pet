-- 使用者選單「問題回報」+「評論／評分」：新增 Feedback 與 AppReview 兩表。
--   Feedback  : 使用者問題回報（content 必填、category 選填、status 預設 pending）。
--   AppReview : 使用者 App 評論（rating 1-5、comment 選填、isPublic 預設 false、status 預設 pending）。
-- 兩表皆不綁 Pet，只記回報者 userId（無外鍵，與既有單一使用者模型一致，避免帳號刪除連動）。
-- 本機已套用（prisma db execute + migrate resolve --applied，避免 reset 清空 dev 資料）。
-- 正式環境（Turso）請於部署流程跑 `prisma migrate deploy`（新增表，對既有資料無破壞性）。
-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "category" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "AppReview" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
