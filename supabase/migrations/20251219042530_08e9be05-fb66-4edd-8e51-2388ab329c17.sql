-- Fix workflow: allow staff to acknowledge manager-reviewed assessments and require directors to act after acknowledgement

-- Update staff acknowledgement policy
DROP POLICY IF EXISTS "Staff can acknowledge director-approved assessments" ON public.assessments;

CREATE POLICY "Staff can acknowledge manager-reviewed assessments"
ON public.assessments
FOR UPDATE
USING (
  staff_id = auth.uid()
  AND status IN ('manager_reviewed', 'director_approved')
)
WITH CHECK (
  staff_id = auth.uid()
  AND status = 'acknowledged'
);

-- Update director approval policy to operate after acknowledgement
DROP POLICY IF EXISTS "Directors can update for approval" ON public.assessments;

CREATE POLICY "Directors can update for approval"
ON public.assessments
FOR UPDATE
USING (
  director_id = auth.uid()
  AND status = 'acknowledged'
)
WITH CHECK (
  director_id = auth.uid()
  AND status IN ('approved', 'rejected')
);
