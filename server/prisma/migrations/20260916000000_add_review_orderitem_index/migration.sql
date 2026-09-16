-- The verified-buyer review flow does a duplicate-check lookup by
-- data.order_item_id on EVERY review submission (findFirst in
-- server/src/routes/reviews.js). Without an index this full-table-scans the
-- Review table, which grows one row per reviewed order item.
--
-- Uses the same expression form as 20260703000000_add_perf_indexes, which was
-- verified (prisma@5.20 + Postgres 16) to compile from `data: { path: [...],
-- equals: ... }` and to be picked up by the planner as a Bitmap Index Scan.

-- CreateIndex
CREATE INDEX "Review_data_order_item_id_idx" ON "Review" (((data #> '{order_item_id}'::text[])::jsonb));
