-- CreateTable
CREATE TABLE "DailyHealthLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "appetite" TEXT,
    "waterMl" INTEGER,
    "waterStatus" TEXT,
    "stoolType" TEXT,
    "stoolDetails" TEXT NOT NULL DEFAULT '[]',
    "urineStatus" TEXT,
    "vitality" TEXT,
    "mood" TEXT NOT NULL DEFAULT '[]',
    "skinHair" TEXT NOT NULL DEFAULT '[]',
    "skinHairPhotos" TEXT NOT NULL DEFAULT '[]',
    "eyeEar" TEXT NOT NULL DEFAULT '[]',
    "eyeEarPhotos" TEXT NOT NULL DEFAULT '[]',
    "dental" TEXT NOT NULL DEFAULT '[]',
    "dentalPhotos" TEXT NOT NULL DEFAULT '[]',
    "digestion" TEXT NOT NULL DEFAULT '[]',
    "digestionPhotos" TEXT NOT NULL DEFAULT '[]',
    "respiratory" TEXT NOT NULL DEFAULT '[]',
    "neuro" TEXT NOT NULL DEFAULT '[]',
    "reproductive" TEXT NOT NULL DEFAULT '[]',
    "dailyChecklist" TEXT NOT NULL DEFAULT '[]',
    "dietStatusTab" TEXT,
    "mealStatuses" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyHealthLog_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MedicationRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "vaccines" TEXT NOT NULL DEFAULT '[]',
    "deworming" TEXT NOT NULL DEFAULT '[]',
    "prescriptions" TEXT NOT NULL DEFAULT '[]',
    "clinicVisits" TEXT NOT NULL DEFAULT '[]',
    "photoUrl" TEXT,
    "nextReminder" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MedicationRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "GroomingRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "medBath" BOOLEAN NOT NULL DEFAULT false,
    "medBathProduct" TEXT,
    "carbonatedSpa" BOOLEAN NOT NULL DEFAULT false,
    "carbonatedProduct" TEXT,
    "dentalClean" BOOLEAN NOT NULL DEFAULT false,
    "dentalProduct" TEXT,
    "customTreatment" BOOLEAN NOT NULL DEFAULT false,
    "customName" TEXT,
    "photoUrl" TEXT,
    "nextReminder" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "GroomingRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "MeasurementRecord" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "weightKg" REAL,
    "bodyCondition" TEXT,
    "rrr" INTEGER,
    "bloodSugarTiming" TEXT,
    "bloodSugarMgdl" REAL,
    "bloodPressureSys" INTEGER,
    "bloodPressureDia" INTEGER,
    "tempMethod" TEXT,
    "tempCelsius" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MeasurementRecord_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyHealthLog_petId_date_key" ON "DailyHealthLog"("petId", "date");
