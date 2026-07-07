-- CreateTable
CREATE TABLE "DeliveryAssignment" (
    "id" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdById" TEXT,
    "createdByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DeliveryAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DeliveryAssignment_createdById_idx" ON "DeliveryAssignment"("createdById");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_createdByEmail_idx" ON "DeliveryAssignment"("createdByEmail");

-- CreateIndex
CREATE INDEX "DeliveryAssignment_createdAt_idx" ON "DeliveryAssignment"("createdAt");
