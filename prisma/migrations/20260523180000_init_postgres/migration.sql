CREATE TYPE "ListingStatus" AS ENUM ('ACTIVE', 'RESERVED', 'SOLD', 'HIDDEN');
CREATE TYPE "DealStatus" AS ENUM ('OPEN', 'CANCELED', 'COMPLETED');

CREATE TABLE "User" (
  "id" TEXT NOT NULL,
  "fullName" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "phone" TEXT NOT NULL,
  "isPhonePublic" BOOLEAN NOT NULL DEFAULT false,
  "isEmailPublic" BOOLEAN NOT NULL DEFAULT false,
  "passwordHash" TEXT,
  "googleSub" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_googleSub_key" ON "User"("googleSub");

CREATE TABLE "Category" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Category_name_key" ON "Category"("name");

CREATE TABLE "SubCategory" (
  "id" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  CONSTRAINT "SubCategory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "SubCategory_categoryId_name_key" ON "SubCategory"("categoryId", "name");
CREATE INDEX "SubCategory_categoryId_idx" ON "SubCategory"("categoryId");

ALTER TABLE "SubCategory"
  ADD CONSTRAINT "SubCategory_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Listing" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "categoryId" TEXT NOT NULL,
  "subCategoryId" TEXT,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "priceCents" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'BRL',
  "status" "ListingStatus" NOT NULL DEFAULT 'ACTIVE',
  "needsReview" BOOLEAN NOT NULL DEFAULT false,
  "city" TEXT,
  "state" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Listing_categoryId_idx" ON "Listing"("categoryId");
CREATE INDEX "Listing_subCategoryId_idx" ON "Listing"("subCategoryId");
CREATE INDEX "Listing_createdAt_idx" ON "Listing"("createdAt");
CREATE INDEX "Listing_userId_needsReview_createdAt_idx" ON "Listing"("userId", "needsReview", "createdAt");

ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_categoryId_fkey"
  FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Listing"
  ADD CONSTRAINT "Listing_subCategoryId_fkey"
  FOREIGN KEY ("subCategoryId") REFERENCES "SubCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "ListingImage" (
  "id" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "url" TEXT NOT NULL,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT "ListingImage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ListingImage_listingId_idx" ON "ListingImage"("listingId");

ALTER TABLE "ListingImage"
  ADD CONSTRAINT "ListingImage_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "Order" (
  "id" TEXT NOT NULL,
  "buyerId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Order_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Order_listingId_key" ON "Order"("listingId");
CREATE INDEX "Order_buyerId_idx" ON "Order"("buyerId");

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_buyerId_fkey"
  FOREIGN KEY ("buyerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Order"
  ADD CONSTRAINT "Order_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "Sale" (
  "id" TEXT NOT NULL,
  "sellerId" TEXT NOT NULL,
  "listingId" TEXT NOT NULL,
  "status" "DealStatus" NOT NULL DEFAULT 'OPEN',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Sale_listingId_key" ON "Sale"("listingId");
CREATE INDEX "Sale_sellerId_idx" ON "Sale"("sellerId");

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_sellerId_fkey"
  FOREIGN KEY ("sellerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Sale"
  ADD CONSTRAINT "Sale_listingId_fkey"
  FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
