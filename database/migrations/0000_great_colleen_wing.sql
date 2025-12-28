CREATE TABLE "calls" (
	"id" serial PRIMARY KEY NOT NULL,
	"patient_id" serial NOT NULL,
	"audio_url" text,
	"transcription" text,
	"sentiment_label" text,
	"status" text DEFAULT 'pending',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "patients" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"phone" varchar(20) NOT NULL,
	"health_issue" text NOT NULL,
	"severity" text NOT NULL,
	"appointment_date" date NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "calls" ADD CONSTRAINT "calls_patient_id_patients_id_fk" FOREIGN KEY ("patient_id") REFERENCES "public"."patients"("id") ON DELETE no action ON UPDATE no action;