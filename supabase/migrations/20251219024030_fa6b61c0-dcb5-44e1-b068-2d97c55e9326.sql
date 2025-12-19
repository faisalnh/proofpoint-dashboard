-- Create table for assessment questions/feedback
CREATE TABLE public.assessment_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  assessment_id UUID NOT NULL REFERENCES public.assessments(id) ON DELETE CASCADE,
  indicator_id UUID REFERENCES public.rubric_indicators(id) ON DELETE SET NULL,
  asked_by UUID NOT NULL,
  question TEXT NOT NULL,
  response TEXT,
  responded_by UUID,
  responded_at TIMESTAMP WITH TIME ZONE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered', 'closed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.assessment_questions ENABLE ROW LEVEL SECURITY;

-- Staff can view questions they asked
CREATE POLICY "Staff can view own questions"
ON public.assessment_questions
FOR SELECT
USING (asked_by = auth.uid());

-- Staff can create questions on their own assessments
CREATE POLICY "Staff can create questions on own assessments"
ON public.assessment_questions
FOR INSERT
WITH CHECK (
  asked_by = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = assessment_id AND staff_id = auth.uid()
  )
);

-- Managers can view questions on assessments they manage
CREATE POLICY "Managers can view team questions"
ON public.assessment_questions
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = assessment_id AND manager_id = auth.uid()
  )
);

-- Managers can respond to questions
CREATE POLICY "Managers can respond to questions"
ON public.assessment_questions
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = assessment_id AND manager_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.assessments 
    WHERE id = assessment_id AND manager_id = auth.uid()
  )
);

-- Admins can manage all questions
CREATE POLICY "Admins can manage all questions"
ON public.assessment_questions
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger for updated_at
CREATE TRIGGER update_assessment_questions_updated_at
BEFORE UPDATE ON public.assessment_questions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();