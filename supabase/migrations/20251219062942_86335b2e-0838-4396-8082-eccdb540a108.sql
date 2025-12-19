-- Drop the existing check constraint and recreate with approved status
ALTER TABLE public.assessments DROP CONSTRAINT IF EXISTS assessments_status_check;

ALTER TABLE public.assessments ADD CONSTRAINT assessments_status_check 
CHECK (status IN ('draft', 'submitted', 'manager_reviewed', 'acknowledged', 'approved', 'rejected'));