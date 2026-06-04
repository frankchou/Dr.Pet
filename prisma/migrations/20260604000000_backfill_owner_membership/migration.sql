-- Backfill owner membership（Phase 1-C 共同飼主存取修復）
--
-- 目的：為所有「有 userId 但尚無對應 PetMember」的既有 Pet 補建一筆 role='owner' 的成員紀錄，
-- 讓 PetMember 與「建立寵物即建 owner membership」的正式流程資料一致。
--
-- 注意：requirePetAccess 已改為雙重判定（Pet.userId 即視為 owner），因此就算缺這筆 membership，
-- owner 也不會被擋。此 backfill 只是讓資料一致、利於成員清單等查詢，並非功能阻擋項。
--
-- 冪等：NOT EXISTS 子句保證重跑安全，也避開 PetMember(petId, userId) 的 UNIQUE 衝突。
-- id：raw SQL 無法套用 Prisma @default(cuid())，改用 randomblob hex 生成內部唯一主鍵；
--     id 格式不影響功能（僅作主鍵）。
-- joinedAt：用 Pet.createdAt，語意上 owner 自寵物建立起即為成員。
--
-- ⚠️ 部署順序（DevOps 注意）：正式 Turso 須「先跑此 backfill migration → 再上權限檢查程式碼」，
--    或於同次 deploy 內讓 migration 先於程式生效，否則正式站既有 owner 會短暫被 403。
--    （雙重判定已大幅降低此風險，但仍以此順序為準。）
INSERT INTO "PetMember" ("id", "petId", "userId", "role", "joinedAt")
SELECT
  lower(hex(randomblob(16))),
  p."id",
  p."userId",
  'owner',
  p."createdAt"
FROM "Pet" p
WHERE p."userId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "PetMember" m
    WHERE m."petId" = p."id" AND m."userId" = p."userId"
  );
