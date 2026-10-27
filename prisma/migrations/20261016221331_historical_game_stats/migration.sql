-- CreateTable
CREATE TABLE "PokemonGameStats" (
    "formId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "specialAttack" INTEGER NOT NULL,
    "specialDefense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,

    CONSTRAINT "PokemonGameStats_pkey" PRIMARY KEY ("formId","gameId")
);

-- AddForeignKey
ALTER TABLE "PokemonGameStats" ADD CONSTRAINT "PokemonGameStats_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonGameStats" ADD CONSTRAINT "PokemonGameStats_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
