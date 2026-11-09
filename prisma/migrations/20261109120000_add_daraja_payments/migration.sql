CREATE TABLE "MpesaSubscription" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "referenceId" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MpesaSubscription_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MpesaCredits" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "subscriptionId" TEXT NOT NULL,
    "minutesRemaining" INTEGER NOT NULL DEFAULT 0,
    "charsRemaining" INTEGER NOT NULL DEFAULT 0,
    "voicesRemaining" INTEGER NOT NULL DEFAULT 0,
    "topUpBalanceUgx" INTEGER NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MpesaCredits_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MpesaPayment" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "amountKes" INTEGER NOT NULL,
    "amountUgxEquivalent" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "plan" TEXT,
    "meter" TEXT,
    "quantity" INTEGER,
    "jobId" TEXT,
    "checkoutRequestId" TEXT,
    "merchantRequestId" TEXT,
    "receipt" TEXT,
    "resultCode" TEXT,
    "resultDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MpesaPayment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "MpesaSubscription_orgId_key" ON "MpesaSubscription"("orgId");
CREATE UNIQUE INDEX "MpesaSubscription_referenceId_key" ON "MpesaSubscription"("referenceId");
CREATE UNIQUE INDEX "MpesaCredits_orgId_key" ON "MpesaCredits"("orgId");
CREATE UNIQUE INDEX "MpesaCredits_subscriptionId_key" ON "MpesaCredits"("subscriptionId");
CREATE UNIQUE INDEX "MpesaPayment_checkoutRequestId_key" ON "MpesaPayment"("checkoutRequestId");
CREATE INDEX "MpesaPayment_orgId_createdAt_idx" ON "MpesaPayment"("orgId", "createdAt");
CREATE INDEX "MpesaPayment_status_createdAt_idx" ON "MpesaPayment"("status", "createdAt");

ALTER TABLE "MpesaCredits"
ADD CONSTRAINT "MpesaCredits_subscriptionId_fkey"
FOREIGN KEY ("subscriptionId") REFERENCES "MpesaSubscription"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
