-- Add director_comments column for director feedback during approval
ALTER TABLE public.assessments ADD COLUMN IF NOT EXISTS director_comments text;