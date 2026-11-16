CREATE TYPE "public"."position_enum" AS ENUM('developer', 'analyst', 'project_manager', 'tester');--> statement-breakpoint
CREATE TYPE "public"."state_enum" AS ENUM('Planned', 'In_progress', 'Done');--> statement-breakpoint
CREATE TABLE "person" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "person_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar NOT NULL,
	"surname" varchar(200) NOT NULL,
	"email" varchar(200) NOT NULL,
	"position" "position_enum" NOT NULL,
	"team_id" integer NOT NULL,
	CONSTRAINT "person_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "project" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "project_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(200) NOT NULL,
	"description" text,
	"state" "state_enum" NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date
);
--> statement-breakpoint
CREATE TABLE "project_person" (
	"project_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	CONSTRAINT "project_person_project_id_person_id_pk" PRIMARY KEY("project_id","person_id")
);
--> statement-breakpoint
CREATE TABLE "project_team" (
	"project_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	CONSTRAINT "project_team_project_id_team_id_pk" PRIMARY KEY("project_id","team_id")
);
--> statement-breakpoint
CREATE TABLE "team" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "team_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"name" varchar(200) NOT NULL
);
--> statement-breakpoint
ALTER TABLE "person" ADD CONSTRAINT "person_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_person" ADD CONSTRAINT "project_person_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_person" ADD CONSTRAINT "project_person_person_id_person_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."person"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_project_id_project_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."project"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_team" ADD CONSTRAINT "project_team_team_id_team_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."team"("id") ON DELETE cascade ON UPDATE no action;