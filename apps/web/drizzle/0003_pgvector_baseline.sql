CREATE EXTENSION IF NOT EXISTS vector;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "article_embeddings" (
  "article_id" integer PRIMARY KEY,
  "index_version" integer NOT NULL DEFAULT 1,
  "category_slug" varchar(120) NOT NULL,
  "published_at" timestamp with time zone,
  "source" varchar(64) NOT NULL DEFAULT 'internal',
  "language" varchar(12) NOT NULL DEFAULT 'vi',
  "embedding" vector(1024) NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_article_embeddings_category_slug"
  ON "article_embeddings" ("category_slug");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_article_embeddings_published_at"
  ON "article_embeddings" ("published_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_article_embeddings_index_version"
  ON "article_embeddings" ("index_version");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_article_embeddings_embedding_ivfflat"
  ON "article_embeddings"
  USING ivfflat ("embedding" vector_cosine_ops)
  WITH (lists = 100);
