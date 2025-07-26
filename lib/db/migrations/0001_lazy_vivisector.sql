CREATE TABLE "sample_images" (
	"id" text PRIMARY KEY NOT NULL,
	"url" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"title" text,
	"description" text,
	"sort_order" integer DEFAULT 0,
	"is_active" boolean DEFAULT true,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
