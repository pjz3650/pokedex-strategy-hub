ALTER TABLE "MoveGameData"
  ADD COLUMN "category" TEXT,
  ADD COLUMN "typeName" TEXT;

ALTER TABLE "MoveGameData" ADD CONSTRAINT "MoveGameData_category_check"
  CHECK ("category" IS NULL OR "category" IN ('status', 'physical', 'special'));
ALTER TABLE "MoveGameData" ADD CONSTRAINT "MoveGameData_typeName_check"
  CHECK ("typeName" IS NULL OR "typeName" IN ('normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'));
