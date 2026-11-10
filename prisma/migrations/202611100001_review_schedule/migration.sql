CREATE TABLE "ReviewSchedule" (
    "sku" TEXT NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "reviewDate" DATE NOT NULL,
    CONSTRAINT "ReviewSchedule_pkey" PRIMARY KEY ("sku", "warehouseCode")
);
