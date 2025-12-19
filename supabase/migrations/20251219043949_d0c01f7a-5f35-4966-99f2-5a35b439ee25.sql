-- Allow directors to view assessments awaiting director approval

DROP POLICY IF EXISTS "Directors can view pending approvals" ON public.assessments;

CREATE POLICY "Directors can view pending approvals"
ON public.assessments
FOR SELECT
USING (
  has_role(auth.uid(), 'director'::app_role)
  AND status = 'manager_reviewed'
);