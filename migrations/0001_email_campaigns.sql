CREATE TABLE "email_campaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text DEFAULT 'meal_plan' NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"audience" text DEFAULT 'subscribers' NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"recipient_count" integer DEFAULT 0 NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"failed_count" integer DEFAULT 0 NOT NULL,
	"skipped_count" integer DEFAULT 0 NOT NULL,
	"created_by" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "email_campaign_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaign_id" integer NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"last_error" text,
	"scheduled_at" timestamp with time zone DEFAULT now() NOT NULL,
	"locked_at" timestamp with time zone,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_usage" (
	"id" serial PRIMARY KEY NOT NULL,
	"month" text NOT NULL,
	"provider" text DEFAULT 'mailtrap' NOT NULL,
	"sent_count" integer DEFAULT 0 NOT NULL,
	"monthly_limit" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_suppressions" (
	"id" serial PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"reason" text DEFAULT 'unsubscribe' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "email_campaigns_status_idx" ON "email_campaigns" USING btree ("status");--> statement-breakpoint
CREATE INDEX "email_campaigns_created_at_idx" ON "email_campaigns" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "email_campaigns_one_running_idx" ON "email_campaigns" ((true)) WHERE "status" IN ('queued','sending');--> statement-breakpoint
CREATE INDEX "email_campaign_recipients_campaign_status_idx" ON "email_campaign_recipients" USING btree ("campaign_id","status");--> statement-breakpoint
CREATE INDEX "email_campaign_recipients_scheduled_idx" ON "email_campaign_recipients" USING btree ("scheduled_at");--> statement-breakpoint
CREATE INDEX "email_campaign_recipients_email_idx" ON "email_campaign_recipients" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "email_usage_month_provider_unique_idx" ON "email_usage" USING btree ("month","provider");--> statement-breakpoint
CREATE UNIQUE INDEX "email_suppressions_email_unique_idx" ON "email_suppressions" USING btree ("email");
