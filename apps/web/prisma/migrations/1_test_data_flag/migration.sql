-- Mark records created by automated tests so production UI can hide them.
ALTER TABLE "Company" ADD COLUMN "isTestData" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Company_isTestData_idx" ON "Company"("isTestData");
