-- CreateTable
CREATE TABLE "MomoSubscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomoSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomoCredits" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "videosRemaining" INTEGER NOT NULL DEFAULT 0,
    "charsRemaining" INTEGER NOT NULL DEFAULT 0,
    "voicesRemaining" INTEGER NOT NULL DEFAULT 0,
    "topUpBalanceUgx" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MomoCredits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MomoTopUp" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "amountUgx" INTEGER NOT NULL,
    "meter" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "referenceId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MomoTopUp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MomoSubscription_orgId_key" ON "MomoSubscription"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "MomoCredits_orgId_key" ON "MomoCredits"("orgId");

-- CreateIndex
CREATE UNIQUE INDEX "MomoCredits_subscriptionId_key" ON "MomoCredits"("subscriptionId");

-- AddForeignKey
ALTER TABLE "MomoCredits" ADD CONSTRAINT "MomoCredits_subscriptionId_fkey" FOREIGN KEY ("subscriptionId") REFERENCES "MomoSubscription"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
