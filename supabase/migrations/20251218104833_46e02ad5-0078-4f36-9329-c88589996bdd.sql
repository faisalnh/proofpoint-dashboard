-- Add evidence guidance and score options to rubric indicators
ALTER TABLE public.rubric_indicators
ADD COLUMN evidence_guidance TEXT,
ADD COLUMN score_options JSONB DEFAULT '[
  {"score": 0, "label": "Critical Failure", "enabled": true},
  {"score": 1, "label": "Below Expectations", "enabled": true},
  {"score": 2, "label": "Meets Standard", "enabled": true},
  {"score": 3, "label": "Exceeds Standard", "enabled": true},
  {"score": 4, "label": "Outstanding", "enabled": true}
]'::jsonb;