-- 20260314_demo_tasks.sql
-- Pilot demo workflow (1000 images): task lifecycle + simulated distributed logs

CREATE EXTENSION IF NOT EXISTS pgcrypto;

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
