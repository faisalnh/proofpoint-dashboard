-- Fix staff submit failing due to UPDATE policy missing WITH CHECK for new status
DROP POLICY IF EXISTS "Staff can update own assessments" ON public.assessments;

-- Allow staff to update their own assessment rows while in draft (edit/save/submit)
-- Existing row must be draft to be editable.
-- New values can remain draft (save) or become self_submitted (submit).
CREATE POLICY "Staff can update own assessments"
ON public.assessments
FOR UPDATE
USING (
  staff_id = auth.uid()
  AND status = 'draft'
)
WITH CHECK (
  staff_id = auth.uid()
  AND status IN ('draft', 'self_submitted')
);

-- Allow staff to acknowledge after director approval
DROP POLICY IF EXISTS "Staff can acknowledge director-approved assessments" ON public.assessments;
CREATE POLICY "Staff can acknowledge director-approved assessments"
ON public.assessments
FOR UPDATE
USING (
  staff_id = auth.uid()
  AND status = 'director_approved'
)
WITH CHECK (
  staff_id = auth.uid()
  AND status = 'acknowledged'
);
