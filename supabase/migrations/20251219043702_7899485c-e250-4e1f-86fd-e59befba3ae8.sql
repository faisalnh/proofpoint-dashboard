-- Fix Director approval RLS: Directors can approve assessments in manager_reviewed status
-- Note: The previous migration already set this correctly, but we need to ensure director_id can be set during approval

-- Allow directors with manager role to update assessments for approval when director_id is null
DROP POLICY IF EXISTS "Directors can update for approval" ON public.assessments;

CREATE POLICY "Directors can update for approval"
ON public.assessments
FOR UPDATE
USING (
  has_role(auth.uid(), 'director')
  AND status = 'manager_reviewed'
)
WITH CHECK (
  has_role(auth.uid(), 'director')
  AND status IN ('approved', 'rejected')
);