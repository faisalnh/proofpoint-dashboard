-- Fix workflow: Director approves after manager review, then staff acknowledges

-- Update staff acknowledgement policy - staff can only acknowledge after director approved
DROP POLICY IF EXISTS "Staff can acknowledge manager-reviewed assessments" ON public.assessments;

CREATE POLICY "Staff can acknowledge director-approved assessments"
ON public.assessments
FOR UPDATE
USING (
  staff_id = auth.uid()
  AND status = 'approved'
)
WITH CHECK (
  staff_id = auth.uid()
  AND status = 'acknowledged'
);

-- Update director approval policy - director can approve/reject after manager review
DROP POLICY IF EXISTS "Directors can update for approval" ON public.assessments;

CREATE POLICY "Directors can update for approval"
ON public.assessments
FOR UPDATE
USING (
  director_id = auth.uid()
  AND status = 'manager_reviewed'
)
WITH CHECK (
  director_id = auth.uid()
  AND status IN ('approved', 'rejected')
);