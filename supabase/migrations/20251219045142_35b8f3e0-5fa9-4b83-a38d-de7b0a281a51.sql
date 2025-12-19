-- Add manager_notes column for overall manager comments during appraisal
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS manager_notes text;