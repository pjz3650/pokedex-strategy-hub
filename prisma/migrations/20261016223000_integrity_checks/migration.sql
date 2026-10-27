ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_slot_range" CHECK ("slot" BETWEEN 0 AND 5);
ALTER TABLE "BuildMove" ADD CONSTRAINT "BuildMove_slot_range" CHECK ("slot" BETWEEN 0 AND 3);
ALTER TABLE "PokemonType" ADD CONSTRAINT "PokemonType_slot_range" CHECK ("slot" BETWEEN 1 AND 2);
ALTER TABLE "RankingEvidence" ADD CONSTRAINT "RankingEvidence_weight_positive" CHECK ("weight" > 0);
ALTER TABLE "MoveGameData" ADD CONSTRAINT "MoveGameData_resources" CHECK (("pp" IS NULL OR "pp" > 0) AND ("cooldown" IS NULL OR "cooldown" > 0));
ALTER TABLE "PokemonStats" ADD CONSTRAINT "PokemonStats_positive" CHECK ("hp" > 0 AND "attack" > 0 AND "defense" > 0 AND "specialAttack" > 0 AND "specialDefense" > 0 AND "speed" > 0);
