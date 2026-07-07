-- Indexes to support the ownership/RLS filters (createdById, createdByEmail)
-- and the createdAt/updatedAt sort used by every entity list/query endpoint
-- (see server/src/routes/entities.js orderByFromSort + entityConfig.js
-- readWhereClause). Without these, every list request full-table-scans as
-- each entity table grows.

-- CreateIndex
CREATE INDEX "CartItem_createdById_idx" ON "CartItem"("createdById");

-- CreateIndex
CREATE INDEX "CartItem_createdByEmail_idx" ON "CartItem"("createdByEmail");

-- CreateIndex
CREATE INDEX "CartItem_createdAt_idx" ON "CartItem"("createdAt");

-- CreateIndex
CREATE INDEX "CategoryConfig_createdById_idx" ON "CategoryConfig"("createdById");

-- CreateIndex
CREATE INDEX "CategoryConfig_createdByEmail_idx" ON "CategoryConfig"("createdByEmail");

-- CreateIndex
CREATE INDEX "CategoryConfig_createdAt_idx" ON "CategoryConfig"("createdAt");

-- CreateIndex
CREATE INDEX "ContactRequest_createdById_idx" ON "ContactRequest"("createdById");

-- CreateIndex
CREATE INDEX "ContactRequest_createdByEmail_idx" ON "ContactRequest"("createdByEmail");

-- CreateIndex
CREATE INDEX "ContactRequest_createdAt_idx" ON "ContactRequest"("createdAt");

-- CreateIndex
CREATE INDEX "Creator_createdById_idx" ON "Creator"("createdById");

-- CreateIndex
CREATE INDEX "Creator_createdByEmail_idx" ON "Creator"("createdByEmail");

-- CreateIndex
CREATE INDEX "Creator_createdAt_idx" ON "Creator"("createdAt");

-- CreateIndex
CREATE INDEX "CreatorProductLink_createdById_idx" ON "CreatorProductLink"("createdById");

-- CreateIndex
CREATE INDEX "CreatorProductLink_createdByEmail_idx" ON "CreatorProductLink"("createdByEmail");

-- CreateIndex
CREATE INDEX "CreatorProductLink_createdAt_idx" ON "CreatorProductLink"("createdAt");

-- CreateIndex
CREATE INDEX "CustomerReferral_createdById_idx" ON "CustomerReferral"("createdById");

-- CreateIndex
CREATE INDEX "CustomerReferral_createdByEmail_idx" ON "CustomerReferral"("createdByEmail");

-- CreateIndex
CREATE INDEX "CustomerReferral_createdAt_idx" ON "CustomerReferral"("createdAt");

-- CreateIndex
CREATE INDEX "Favorite_createdById_idx" ON "Favorite"("createdById");

-- CreateIndex
CREATE INDEX "Favorite_createdByEmail_idx" ON "Favorite"("createdByEmail");

-- CreateIndex
CREATE INDEX "Favorite_createdAt_idx" ON "Favorite"("createdAt");

-- CreateIndex
CREATE INDEX "Message_createdById_idx" ON "Message"("createdById");

-- CreateIndex
CREATE INDEX "Message_createdByEmail_idx" ON "Message"("createdByEmail");

-- CreateIndex
CREATE INDEX "Message_createdAt_idx" ON "Message"("createdAt");

-- CreateIndex
CREATE INDEX "Notification_createdById_idx" ON "Notification"("createdById");

-- CreateIndex
CREATE INDEX "Notification_createdByEmail_idx" ON "Notification"("createdByEmail");

-- CreateIndex
CREATE INDEX "Notification_createdAt_idx" ON "Notification"("createdAt");

-- CreateIndex
CREATE INDEX "Order_createdById_idx" ON "Order"("createdById");

-- CreateIndex
CREATE INDEX "Order_createdByEmail_idx" ON "Order"("createdByEmail");

-- CreateIndex
CREATE INDEX "Order_createdAt_idx" ON "Order"("createdAt");

-- CreateIndex
CREATE INDEX "Product_createdById_idx" ON "Product"("createdById");

-- CreateIndex
CREATE INDEX "Product_createdByEmail_idx" ON "Product"("createdByEmail");

-- CreateIndex
CREATE INDEX "Product_createdAt_idx" ON "Product"("createdAt");

-- CreateIndex
CREATE INDEX "ProductEvent_createdById_idx" ON "ProductEvent"("createdById");

-- CreateIndex
CREATE INDEX "ProductEvent_createdByEmail_idx" ON "ProductEvent"("createdByEmail");

-- CreateIndex
CREATE INDEX "ProductEvent_createdAt_idx" ON "ProductEvent"("createdAt");

-- CreateIndex
CREATE INDEX "ProductLike_createdById_idx" ON "ProductLike"("createdById");

-- CreateIndex
CREATE INDEX "ProductLike_createdByEmail_idx" ON "ProductLike"("createdByEmail");

-- CreateIndex
CREATE INDEX "ProductLike_createdAt_idx" ON "ProductLike"("createdAt");

-- CreateIndex
CREATE INDEX "ProductShare_createdById_idx" ON "ProductShare"("createdById");

-- CreateIndex
CREATE INDEX "ProductShare_createdByEmail_idx" ON "ProductShare"("createdByEmail");

-- CreateIndex
CREATE INDEX "ProductShare_createdAt_idx" ON "ProductShare"("createdAt");

-- CreateIndex
CREATE INDEX "ReferralLink_createdById_idx" ON "ReferralLink"("createdById");

-- CreateIndex
CREATE INDEX "ReferralLink_createdByEmail_idx" ON "ReferralLink"("createdByEmail");

-- CreateIndex
CREATE INDEX "ReferralLink_createdAt_idx" ON "ReferralLink"("createdAt");

-- CreateIndex
CREATE INDEX "Review_createdById_idx" ON "Review"("createdById");

-- CreateIndex
CREATE INDEX "Review_createdByEmail_idx" ON "Review"("createdByEmail");

-- CreateIndex
CREATE INDEX "Review_createdAt_idx" ON "Review"("createdAt");

-- CreateIndex
CREATE INDEX "UserBehavior_createdById_idx" ON "UserBehavior"("createdById");

-- CreateIndex
CREATE INDEX "UserBehavior_createdByEmail_idx" ON "UserBehavior"("createdByEmail");

-- CreateIndex
CREATE INDEX "UserBehavior_createdAt_idx" ON "UserBehavior"("createdAt");

-- CreateIndex
CREATE INDEX "UserNotification_createdById_idx" ON "UserNotification"("createdById");

-- CreateIndex
CREATE INDEX "UserNotification_createdByEmail_idx" ON "UserNotification"("createdByEmail");

-- CreateIndex
CREATE INDEX "UserNotification_createdAt_idx" ON "UserNotification"("createdAt");

-- Expression (btree-on-jsonb-text) indexes for the highest-traffic JSON
-- path filters. Prisma's `data: { path: [...], equals: ... }` filter compiles
-- to a `(data #> '{key}')::jsonb = value` predicate on Postgres (verified via
-- query-event logging against prisma@5.20 + Postgres 16), which a plain GIN
-- index on the whole `data` column cannot accelerate -- it needs a matching
-- expression index per key. These cover: the storefront's published-products
-- feed (hit on every visitor page load), review-rating rollups, and the
-- owner-scoped RLS reads for Message/CustomerReferral/ReferralLink/UserNotification.
-- Confirmed with EXPLAIN that the planner picks these up as Bitmap Index Scans.

-- CreateIndex
CREATE INDEX "Product_data_published_idx" ON "Product" (((data #> '{published}'::text[])::jsonb));

-- CreateIndex
CREATE INDEX "Review_data_product_id_idx" ON "Review" (((data #> '{product_id}'::text[])::jsonb));

-- CreateIndex
CREATE INDEX "Message_data_user_email_idx" ON "Message" (((data #> '{user_email}'::text[])::jsonb));

-- CreateIndex
CREATE INDEX "CustomerReferral_data_customer_email_idx" ON "CustomerReferral" (((data #> '{customer_email}'::text[])::jsonb));

-- CreateIndex
CREATE INDEX "ReferralLink_data_owner_user_id_idx" ON "ReferralLink" (((data #> '{owner_user_id}'::text[])::jsonb));

-- CreateIndex
CREATE INDEX "UserNotification_data_user_id_idx" ON "UserNotification" (((data #> '{user_id}'::text[])::jsonb));
