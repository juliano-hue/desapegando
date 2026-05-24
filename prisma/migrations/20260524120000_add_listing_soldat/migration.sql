ALTER TABLE "Listing" ADD COLUMN "soldAt" TIMESTAMP(3);

CREATE INDEX "Listing_status_soldAt_idx" ON "Listing"("status", "soldAt");
