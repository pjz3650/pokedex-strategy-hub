-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "sessionVersion" INTEGER NOT NULL DEFAULT 0,
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "region" TEXT NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameVersion" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,

    CONSTRAINT "GameVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameExpansion" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GameExpansion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonSpecies" (
    "id" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "genus" TEXT,
    "generation" INTEGER NOT NULL,
    "evolvesFromId" INTEGER,
    "legendary" BOOLEAN NOT NULL DEFAULT false,
    "mythical" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "PokemonSpecies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonForm" (
    "id" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "speciesId" INTEGER NOT NULL,
    "isDefault" BOOLEAN NOT NULL,
    "kind" TEXT NOT NULL,
    "height" DOUBLE PRECISION,
    "weight" DOUBLE PRECISION,
    "sprite" TEXT,
    "artwork" TEXT,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "PokemonForm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonStats" (
    "formId" INTEGER NOT NULL,
    "hp" INTEGER NOT NULL,
    "attack" INTEGER NOT NULL,
    "defense" INTEGER NOT NULL,
    "specialAttack" INTEGER NOT NULL,
    "specialDefense" INTEGER NOT NULL,
    "speed" INTEGER NOT NULL,

    CONSTRAINT "PokemonStats_pkey" PRIMARY KEY ("formId")
);

-- CreateTable
CREATE TABLE "Type" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Type_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonType" (
    "formId" INTEGER NOT NULL,
    "typeId" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,

    CONSTRAINT "PokemonType_pkey" PRIMARY KEY ("formId","slot")
);

-- CreateTable
CREATE TABLE "PokemonGameAvailability" (
    "formId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "minStage" INTEGER,
    "acquisition" TEXT NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT NOT NULL,
    "checkedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokemonGameAvailability_pkey" PRIMARY KEY ("formId","gameId")
);

-- CreateTable
CREATE TABLE "Move" (
    "id" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "typeId" INTEGER NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "Move_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MoveGameData" (
    "moveId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "power" INTEGER,
    "accuracy" INTEGER,
    "pp" INTEGER,
    "cooldown" DOUBLE PRECISION,
    "priority" INTEGER,
    "range" TEXT,
    "area" TEXT,
    "effect" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "MoveGameData_pkey" PRIMARY KEY ("moveId","gameId")
);

-- CreateTable
CREATE TABLE "PokemonLearnset" (
    "formId" INTEGER NOT NULL,
    "moveId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "versionGroup" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "content" TEXT NOT NULL,
    "minStage" INTEGER,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "PokemonLearnset_pkey" PRIMARY KEY ("formId","moveId","versionGroup","method","level")
);

-- CreateTable
CREATE TABLE "Ability" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Ability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonAbilityAvailability" (
    "formId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "abilityId" INTEGER NOT NULL,
    "hidden" BOOLEAN NOT NULL,

    CONSTRAINT "PokemonAbilityAvailability_pkey" PRIMARY KEY ("formId","gameId","abilityId")
);

-- CreateTable
CREATE TABLE "Item" (
    "id" INTEGER NOT NULL,
    "identifier" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,

    CONSTRAINT "Item_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ItemGameAvailability" (
    "itemId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "minStage" INTEGER,
    "effect" TEXT,
    "location" TEXT,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "ItemGameAvailability_pkey" PRIMARY KEY ("itemId","gameId")
);

-- CreateTable
CREATE TABLE "Evolution" (
    "id" INTEGER NOT NULL,
    "fromSpeciesId" INTEGER NOT NULL,
    "toSpeciesId" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "conditions" JSONB NOT NULL,

    CONSTRAINT "Evolution_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Location" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Location_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PokemonEncounter" (
    "id" TEXT NOT NULL,
    "formId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "locationId" TEXT NOT NULL,
    "method" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,

    CONSTRAINT "PokemonEncounter_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CampaignStage" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "CampaignStage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UnlockRequirement" (
    "id" TEXT NOT NULL,
    "stageId" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "sourceUrl" TEXT,

    CONSTRAINT "UnlockRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleFormat" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL,
    "teamSize" INTEGER NOT NULL,
    "verified" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "BattleFormat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BattleRegulation" (
    "id" TEXT NOT NULL,
    "formatId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "historical" BOOLEAN NOT NULL,
    "rules" JSONB NOT NULL,
    "sourceUrl" TEXT NOT NULL,

    CONSTRAINT "BattleRegulation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Build" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "style" TEXT NOT NULL,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Build_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BuildMove" (
    "buildId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "moveId" INTEGER NOT NULL,

    CONSTRAINT "BuildMove_pkey" PRIMARY KEY ("buildId","slot")
);

-- CreateTable
CREATE TABLE "Team" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'story',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Team_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamMember" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "formId" INTEGER NOT NULL,
    "config" JSONB NOT NULL,

    CONSTRAINT "TeamMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TeamAnalysis" (
    "id" TEXT NOT NULL,
    "teamId" TEXT NOT NULL,
    "engineVersion" TEXT NOT NULL,
    "result" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TeamAnalysis_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierList" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "stage" INTEGER,

    CONSTRAINT "TierList_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TierEntry" (
    "id" TEXT NOT NULL,
    "tierListId" TEXT NOT NULL,
    "formId" INTEGER NOT NULL,
    "tier" TEXT NOT NULL,
    "score" DOUBLE PRECISION,

    CONSTRAINT "TierEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingSource" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "license" TEXT,
    "publishedAt" TIMESTAMP(3),
    "collectedAt" TIMESTAMP(3) NOT NULL,
    "confidence" TEXT NOT NULL,

    CONSTRAINT "RankingSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RankingEvidence" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "tierEntryId" TEXT NOT NULL,
    "classification" TEXT NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL,
    "scope" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "quantitative" BOOLEAN NOT NULL,

    CONSTRAINT "RankingEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Favorite" (
    "userId" TEXT NOT NULL,
    "formId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Favorite_pkey" PRIMARY KEY ("userId","formId")
);

-- CreateTable
CREATE TABLE "ChatConversation" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatConversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChatMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "context" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ChatMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AnalysisHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "formId" INTEGER NOT NULL,
    "gameId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AnalysisHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataImportRun" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "commit" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "counts" JSONB,
    "error" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),

    CONSTRAINT "DataImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RateLimit" (
    "key" TEXT NOT NULL,
    "count" INTEGER NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE INDEX "Session_expires_idx" ON "Session"("expires");

-- CreateIndex
CREATE INDEX "PasswordResetToken_expires_idx" ON "PasswordResetToken"("expires");

-- CreateIndex
CREATE UNIQUE INDEX "GameVersion_name_key" ON "GameVersion"("name");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonSpecies_identifier_key" ON "PokemonSpecies"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonForm_identifier_key" ON "PokemonForm"("identifier");

-- CreateIndex
CREATE INDEX "PokemonForm_speciesId_idx" ON "PokemonForm"("speciesId");

-- CreateIndex
CREATE INDEX "PokemonForm_kind_idx" ON "PokemonForm"("kind");

-- CreateIndex
CREATE UNIQUE INDEX "Type_name_key" ON "Type"("name");

-- CreateIndex
CREATE INDEX "PokemonGameAvailability_gameId_minStage_idx" ON "PokemonGameAvailability"("gameId", "minStage");

-- CreateIndex
CREATE UNIQUE INDEX "Move_identifier_key" ON "Move"("identifier");

-- CreateIndex
CREATE INDEX "PokemonLearnset_formId_gameId_idx" ON "PokemonLearnset"("formId", "gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Item_identifier_key" ON "Item"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "PokemonEncounter_formId_gameId_locationId_key" ON "PokemonEncounter"("formId", "gameId", "locationId");

-- CreateIndex
CREATE UNIQUE INDEX "CampaignStage_gameId_order_key" ON "CampaignStage"("gameId", "order");

-- CreateIndex
CREATE INDEX "Build_userId_gameId_idx" ON "Build"("userId", "gameId");

-- CreateIndex
CREATE INDEX "Team_userId_updatedAt_idx" ON "Team"("userId", "updatedAt");

-- CreateIndex
CREATE UNIQUE INDEX "TeamMember_teamId_slot_key" ON "TeamMember"("teamId", "slot");

-- CreateIndex
CREATE UNIQUE INDEX "TierEntry_tierListId_formId_key" ON "TierEntry"("tierListId", "formId");

-- CreateIndex
CREATE UNIQUE INDEX "RankingEvidence_sourceId_tierEntryId_key" ON "RankingEvidence"("sourceId", "tierEntryId");

-- CreateIndex
CREATE INDEX "AnalysisHistory_userId_createdAt_idx" ON "AnalysisHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "RateLimit_expires_idx" ON "RateLimit"("expires");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameVersion" ADD CONSTRAINT "GameVersion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameExpansion" ADD CONSTRAINT "GameExpansion_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonForm" ADD CONSTRAINT "PokemonForm_speciesId_fkey" FOREIGN KEY ("speciesId") REFERENCES "PokemonSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonForm" ADD CONSTRAINT "PokemonForm_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RankingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonStats" ADD CONSTRAINT "PokemonStats_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonType" ADD CONSTRAINT "PokemonType_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonType" ADD CONSTRAINT "PokemonType_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonGameAvailability" ADD CONSTRAINT "PokemonGameAvailability_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonGameAvailability" ADD CONSTRAINT "PokemonGameAvailability_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonGameAvailability" ADD CONSTRAINT "PokemonGameAvailability_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RankingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Move" ADD CONSTRAINT "Move_typeId_fkey" FOREIGN KEY ("typeId") REFERENCES "Type"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveGameData" ADD CONSTRAINT "MoveGameData_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "Move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveGameData" ADD CONSTRAINT "MoveGameData_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MoveGameData" ADD CONSTRAINT "MoveGameData_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RankingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonLearnset" ADD CONSTRAINT "PokemonLearnset_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonLearnset" ADD CONSTRAINT "PokemonLearnset_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "Move"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonLearnset" ADD CONSTRAINT "PokemonLearnset_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonLearnset" ADD CONSTRAINT "PokemonLearnset_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RankingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAbilityAvailability" ADD CONSTRAINT "PokemonAbilityAvailability_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAbilityAvailability" ADD CONSTRAINT "PokemonAbilityAvailability_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonAbilityAvailability" ADD CONSTRAINT "PokemonAbilityAvailability_abilityId_fkey" FOREIGN KEY ("abilityId") REFERENCES "Ability"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGameAvailability" ADD CONSTRAINT "ItemGameAvailability_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGameAvailability" ADD CONSTRAINT "ItemGameAvailability_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ItemGameAvailability" ADD CONSTRAINT "ItemGameAvailability_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RankingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_fromSpeciesId_fkey" FOREIGN KEY ("fromSpeciesId") REFERENCES "PokemonSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evolution" ADD CONSTRAINT "Evolution_toSpeciesId_fkey" FOREIGN KEY ("toSpeciesId") REFERENCES "PokemonSpecies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonEncounter" ADD CONSTRAINT "PokemonEncounter_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonEncounter" ADD CONSTRAINT "PokemonEncounter_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonEncounter" ADD CONSTRAINT "PokemonEncounter_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "Location"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PokemonEncounter" ADD CONSTRAINT "PokemonEncounter_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RankingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CampaignStage" ADD CONSTRAINT "CampaignStage_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UnlockRequirement" ADD CONSTRAINT "UnlockRequirement_stageId_fkey" FOREIGN KEY ("stageId") REFERENCES "CampaignStage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleFormat" ADD CONSTRAINT "BattleFormat_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BattleRegulation" ADD CONSTRAINT "BattleRegulation_formatId_fkey" FOREIGN KEY ("formatId") REFERENCES "BattleFormat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Build" ADD CONSTRAINT "Build_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildMove" ADD CONSTRAINT "BuildMove_buildId_fkey" FOREIGN KEY ("buildId") REFERENCES "Build"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BuildMove" ADD CONSTRAINT "BuildMove_moveId_fkey" FOREIGN KEY ("moveId") REFERENCES "Move"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamMember" ADD CONSTRAINT "TeamMember_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TeamAnalysis" ADD CONSTRAINT "TeamAnalysis_teamId_fkey" FOREIGN KEY ("teamId") REFERENCES "Team"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierList" ADD CONSTRAINT "TierList_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierEntry" ADD CONSTRAINT "TierEntry_tierListId_fkey" FOREIGN KEY ("tierListId") REFERENCES "TierList"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TierEntry" ADD CONSTRAINT "TierEntry_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEvidence" ADD CONSTRAINT "RankingEvidence_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "RankingSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RankingEvidence" ADD CONSTRAINT "RankingEvidence_tierEntryId_fkey" FOREIGN KEY ("tierEntryId") REFERENCES "TierEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Favorite" ADD CONSTRAINT "Favorite_formId_fkey" FOREIGN KEY ("formId") REFERENCES "PokemonForm"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatConversation" ADD CONSTRAINT "ChatConversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChatMessage" ADD CONSTRAINT "ChatMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "ChatConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnalysisHistory" ADD CONSTRAINT "AnalysisHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
