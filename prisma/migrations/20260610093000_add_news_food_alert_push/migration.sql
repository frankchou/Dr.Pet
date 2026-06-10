-- Phase 5-C 食安警報推播：NewsArticle 新增兩欄
--   affectedBrands    : AI 生成食安警報時一併輸出的「涉及廠商/品牌/產品關鍵詞」(JSON string array)，供個人化頭條比對 PetProduct
--   foodAlertPushedAt : 已觸發食安推播的時間戳，非 null = 已推，防止重複推播
-- 本機已套用（prisma db execute + migrate resolve --applied，避免 reset 清空 dev 資料）。
-- 正式環境請於部署流程跑 `prisma migrate deploy`（兩欄皆 nullable，對既有資料無破壞性）。
-- AlterTable
ALTER TABLE "NewsArticle" ADD COLUMN "affectedBrands" TEXT;
ALTER TABLE "NewsArticle" ADD COLUMN "foodAlertPushedAt" DATETIME;
