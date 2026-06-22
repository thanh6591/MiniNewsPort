ALTER TABLE "import_batches" DROP CONSTRAINT "import_batches_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "news" DROP CONSTRAINT "news_category_id_categories_id_fk";
--> statement-breakpoint
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "news" ADD CONSTRAINT "news_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;