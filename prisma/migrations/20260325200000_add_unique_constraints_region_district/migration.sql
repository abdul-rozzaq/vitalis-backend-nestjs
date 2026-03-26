-- AlterTable: add unique constraint on regions.name
CREATE UNIQUE INDEX IF NOT EXISTS "regions_name_key" ON "regions"("name");

-- AlterTable: add unique constraint on districts(name, regionId)
CREATE UNIQUE INDEX IF NOT EXISTS "districts_name_regionId_key" ON "districts"("name", "regionId");
