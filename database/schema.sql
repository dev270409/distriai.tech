-- DISTRIAI Database Schema
-- Run this in Supabase SQL Editor

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS pilot_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    role text,
    company text,
    message text,
    created_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS node_waitlist (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    email text NOT NULL,
    gpu_type text,
    country text,
    created_at timestamptz NOT NULL DEFAULT now(),
    status text NOT NULL DEFAULT 'new'
);

CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    email text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS newsletter_subscribers_email_key ON newsletter_subscribers(email);
CREATE INDEX IF NOT EXISTS idx_pilot_requests_created_at ON pilot_requests(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_node_waitlist_created_at ON node_waitlist(created_at DESC);

-- Demo tasks for 1000-image pilot
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'demo_task_status') THEN
    CREATE TYPE demo_task_status AS ENUM (
      'SUBMITTING',
      'FRAGMENTING',
      'SCHEDULING',
      'EXECUTING',
      'VALIDATING',
      'COMPLETED'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS demo_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_id integer NOT NULL CHECK (image_id >= 1 AND image_id <= 1000),
  image_url text NOT NULL,
  status demo_task_status NOT NULL DEFAULT 'SUBMITTING',
  node_logs jsonb NOT NULL DEFAULT '{}'::jsonb,
  audit_trail jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
 codex/integrate-pilot-demo-for-1000-images-a82m8c

codex/integrate-pilot-demo-for-1000-images-cwnjh6

 codex/integrate-pilot-demo-for-1000-images
 main
 main


CREATE INDEX IF NOT EXISTS demo_tasks_status_idx ON demo_tasks (status);
CREATE INDEX IF NOT EXISTS demo_tasks_created_at_idx ON demo_tasks (created_at DESC);

CREATE OR REPLACE FUNCTION set_demo_tasks_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS demo_tasks_set_updated_at ON demo_tasks;

CREATE TRIGGER demo_tasks_set_updated_at
BEFORE UPDATE ON demo_tasks
FOR EACH ROW
EXECUTE FUNCTION set_demo_tasks_updated_at();
 codex/integrate-pilot-demo-for-1000-images-a82m8c

 codex/integrate-pilot-demo-for-1000-images-cwnjh6

 main
 main
