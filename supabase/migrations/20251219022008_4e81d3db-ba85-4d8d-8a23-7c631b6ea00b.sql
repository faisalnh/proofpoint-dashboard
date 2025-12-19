-- Drop the existing policy that's too restrictive
DROP POLICY IF EXISTS "Staff can update own draft assessments" ON public.assessments;

-- Create a new policy that allows staff to update their own assessments when:
-- 1. The current status is 'draft' (they can save drafts or submit)
-- 2. The current status is 'director_approved' and they're acknowledging (updating to 'acknowledged')
CREATE POLICY "Staff can update own assessments"
ON public.assessments
FOR UPDATE
USING (
  staff_id = auth.uid() 
  AND (
    status = 'draft' 
    OR status = 'director_approved'
  )
);