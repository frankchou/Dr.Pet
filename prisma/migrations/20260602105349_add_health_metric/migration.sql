-- CreateTable
CREATE TABLE "HealthMetric" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "petId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "bodyScore" INTEGER,
    "vitality" TEXT,
    "waterIntake" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "HealthMetric_petId_fkey" FOREIGN KEY ("petId") REFERENCES "Pet" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "HealthMetric_petId_date_key" ON "HealthMetric"("petId", "date");
