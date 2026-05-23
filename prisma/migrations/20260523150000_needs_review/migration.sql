ALTER TABLE "Listing" ADD COLUMN "needsReview" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Listing_userId_needsReview_createdAt_idx" ON "Listing"("userId", "needsReview", "createdAt");
