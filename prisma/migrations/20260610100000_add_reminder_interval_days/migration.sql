-- Phase 5-D 週期性提醒：MedicationRecord / GroomingRecord 各新增一欄
--   reminderIntervalDays : 提醒週期天數。null = 一次性（到期推完清 nextReminder）、
--                          >0 = 每 N 天循環（到期推完 nextReminder += N，自動順延下次）。
-- 本機已套用（prisma db execute + migrate resolve --applied，避免 reset 清空 dev 資料）。
-- 正式環境請於部署流程跑 `prisma migrate deploy`（兩欄皆 nullable，對既有資料無破壞性）。
-- AlterTable
ALTER TABLE "MedicationRecord" ADD COLUMN "reminderIntervalDays" INTEGER;
ALTER TABLE "GroomingRecord" ADD COLUMN "reminderIntervalDays" INTEGER;
