-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "isOnline" BOOLEAN NOT NULL DEFAULT false,
    "scope" TEXT,
    "expires" DATETIME,
    "accessToken" TEXT NOT NULL,
    "userId" BIGINT,
    "firstName" TEXT,
    "lastName" TEXT,
    "email" TEXT,
    "accountOwner" BOOLEAN NOT NULL DEFAULT false,
    "locale" TEXT,
    "collaborator" BOOLEAN DEFAULT false,
    "emailVerified" BOOLEAN DEFAULT false
);

-- CreateTable
CREATE TABLE "ShopConfig" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'free',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "preset" TEXT NOT NULL DEFAULT 'autumn-leaves',
    "density" INTEGER NOT NULL DEFAULT 40,
    "speed" INTEGER NOT NULL DEFAULT 50,
    "size" INTEGER NOT NULL DEFAULT 28,
    "wind" INTEGER NOT NULL DEFAULT 0,
    "rotation" BOOLEAN NOT NULL DEFAULT true,
    "opacity" INTEGER NOT NULL DEFAULT 90,
    "pages" TEXT NOT NULL DEFAULT 'all',
    "startAt" DATETIME,
    "endAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "CustomAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "shop" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "shopConfigId" TEXT,
    CONSTRAINT "CustomAsset_shopConfigId_fkey" FOREIGN KEY ("shopConfigId") REFERENCES "ShopConfig" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ShopConfig_shop_key" ON "ShopConfig"("shop");

-- CreateIndex
CREATE INDEX "CustomAsset_shop_idx" ON "CustomAsset"("shop");
