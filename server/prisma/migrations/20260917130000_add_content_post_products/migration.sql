-- Add the product selected from the keyword-to-product fit analysis.
ALTER TABLE "ContentPost" ADD COLUMN "productId" TEXT;

CREATE INDEX "ContentPost_productId_idx" ON "ContentPost"("productId");

ALTER TABLE "ContentPost"
ADD CONSTRAINT "ContentPost_productId_fkey"
FOREIGN KEY ("productId") REFERENCES "Product"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
