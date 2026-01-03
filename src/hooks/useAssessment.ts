import { useState, useEffect } from "react";
import { api } from "@/lib/api-client";
import { useAuth } from "./useAuth";
import { toast } from "./use-toast";

export interface ScoreOption {
  score: number;
  label: string;
  enabled: boolean;
}

export interface EvidenceItem {
  evidence: string;
  notes: string;
}

export interface IndicatorData {
  id: string;
  name: string;
  description: string;
  evidence_guidance: string | null;
  score_options: ScoreOption[];
  score: number | null;
  evidence: string | EvidenceItem[];
  // Manager data for review comparison
  managerScore?: number | null;
  managerEvidence?: string | EvidenceItem[];
}

export interface SectionData {
  id: string;
  name: string;
  weight: number;
  indicators: IndicatorData[];
}

// Helper to check if indicator has valid evidence
export function hasValidEvidence(evidence: string | EvidenceItem[]): boolean {
  if (Array.isArray(evidence)) {
    return evidence.some(e => e.evidence.trim().length > 0);
  }
  return typeof evidence === 'string' && evidence.trim().length > 0;
}

export interface Assessment {
  id: string;
  period: string;
  status: string;
  template_id: string;
  staff_id: string;
  manager_id: string | null;
  director_id: string | null;
  staff_scores: Record<string, number>;
  staff_evidence: Record<string, string>;
  manager_scores: Record<string, number>;
  manager_evidence: Record<string, string>;
  final_score: number | null;
  final_grade: string | null;
  manager_notes: string | null;
  director_comments: string | null;
  staff_submitted_at: string | null;
  manager_reviewed_at: string | null;
  director_approved_at: string | null;
  created_at: string;
}

interface RubricTemplate {
  id: string;
  name: string;
  description: string | null;
  sections: {
    id: string;
    name: string;
    weight: number;
    sort_order: number;
    indicators: {
      id: string;
      name: string;
      description: string | null;
      evidence_guidance: string | null;
      score_options: ScoreOption[];
      sort_order: number;
    }[];
  }[];
}

export function useRubricTemplates() {
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await api.getRubrics();

      if (error) {
        console.error('Error fetching templates:', error);
        setLoading(false);
        return;
      }

      // API already returns enriched data with sections and indicators
      setTemplates((data as any[]) || []);
      setLoading(false);
    }

    fetchTemplates();
  }, []);

  return { templates, loading };
}

export function useAssessment(assessmentId?: string) {
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [managerFeedback, setManagerFeedback] = useState("");

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }

    async function fetchAssessment() {
      const { data: assessmentData, error: assessmentError } = await api.getAssessment(assessmentId);

      if (assessmentError || !assessmentData) {
        console.error('Error fetching assessment:', assessmentError);
        setLoading(false);
        return;
      }

      setAssessment(assessmentData as Assessment);
      setManagerFeedback((assessmentData as any).manager_notes || "");

      // Fetch rubric template with sections and indicators
      const template_id = (assessmentData as any).template_id;
      if (template_id) {
        const { data: rubricData, error: rubricError } = await api.getRubric(template_id);

        if (rubricError || !rubricData) {
          console.error('Error fetching rubric:', rubricError);
        } else {
          const data = assessmentData as any;
          const template = rubricData as any;

          const staffScores = (data.staff_scores || {}) as Record<string, number>;
          const staffEvidence = (data.staff_evidence || {}) as Record<string, string | EvidenceItem[]>;
          const managerScores = (data.manager_scores || {}) as Record<string, number>;
          const managerEvidence = (data.manager_evidence || {}) as Record<string, string | EvidenceItem[]>;

          const formattedSections = (template.sections || [])
            .map((s: any) => ({
              id: s.id,
              name: s.name,
              weight: Number(s.weight),
              indicators: (s.indicators || [])
                .map((i: any) => ({
                  id: i.id,
                  name: i.name,
                  description: i.description || '',
                  evidence_guidance: i.evidence_guidance,
                  score_options: i.score_options as ScoreOption[],
                  score: staffScores[i.id] ?? null,
                  evidence: staffEvidence[i.id] || '',
                  managerScore: managerScores[i.id] ?? null,
                  managerEvidence: managerEvidence[i.id] || '',
                }))
            }));

          setSections(formattedSections);
        }
      }

      setLoading(false);
    }

    fetchAssessment();
  }, [assessmentId]);

  const saveDraft = async () => {
    if (!assessment) return;

    setSaving(true);
    const updates: any = {};

    // Determine if we are saving staff or manager data
    const isManagerView = assessment.status === 'self_submitted' || assessment.status === 'manager_reviewed';

    if (isManagerView) {
      const managerScores: Record<string, number> = {};
      const managerEvidence: Record<string, string | EvidenceItem[]> = {};

      sections.forEach(section => {
        section.indicators.forEach(indicator => {
          if (indicator.managerScore !== null && indicator.managerScore !== undefined) {
            managerScores[indicator.id] = indicator.managerScore;
          }
          if (indicator.managerEvidence) {
            managerEvidence[indicator.id] = indicator.managerEvidence;
          }
        });
      });

      updates.manager_scores = managerScores;
      updates.manager_evidence = managerEvidence;
      updates.manager_notes = managerFeedback;
    } else {
      const staffScores: Record<string, number> = {};
      const staffEvidence: Record<string, string | EvidenceItem[]> = {};

      sections.forEach(section => {
        section.indicators.forEach(indicator => {
          if (indicator.score !== null) {
            staffScores[indicator.id] = indicator.score;
          }
          if (indicator.evidence) {
            staffEvidence[indicator.id] = indicator.evidence;
          }
        });
      });

      updates.staff_scores = staffScores;
      updates.staff_evidence = staffEvidence;
    }

    const { error } = await api.updateAssessment(assessment.id, updates);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to save draft", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Draft saved successfully" });
    }
  };

  const submitAssessment = async () => {
    if (!assessment) return;

    setSaving(true);
    const staffScores: Record<string, number> = {};
    const staffEvidence: Record<string, string | EvidenceItem[]> = {};

    sections.forEach(section => {
      section.indicators.forEach(indicator => {
        if (indicator.score !== null) {
          staffScores[indicator.id] = indicator.score;
        }
        if (indicator.evidence) {
          staffEvidence[indicator.id] = indicator.evidence;
        }
      });
    });

    const { error } = await api.updateAssessment(assessment.id, {
      staff_scores: staffScores,
      staff_evidence: staffEvidence,
      status: 'self_submitted',
      staff_submitted_at: new Date().toISOString(),
    });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to submit assessment", variant: "destructive" });
    } else {
      toast({ title: "Submitted", description: "Assessment submitted for manager review" });
      setAssessment(prev => prev ? { ...prev, status: 'self_submitted' } : null);
    }
  };

  const submitReview = async () => {
    if (!assessment) return;

    setSaving(true);
    const managerScores: Record<string, number> = {};
    const managerEvidence: Record<string, string | EvidenceItem[]> = {};

    sections.forEach(section => {
      section.indicators.forEach(indicator => {
        if (indicator.managerScore !== null && indicator.managerScore !== undefined) {
          managerScores[indicator.id] = indicator.managerScore;
        }
        if (indicator.managerEvidence) {
          managerEvidence[indicator.id] = indicator.managerEvidence;
        }
      });
    });

    // Calculate final score for performance review
    const finalScore = calculateWeightedScore(sections, 'manager');

    if (!managerFeedback || !managerFeedback.trim()) {
      toast({
        title: "Feedback Required",
        description: "Please provide overall feedback before submitting the review.",
        variant: "destructive"
      });
      setSaving(false);
      return;
    }

    const { error } = await api.updateAssessment(assessment.id, {
      manager_scores: managerScores,
      manager_evidence: managerEvidence,
      manager_notes: managerFeedback,
      status: 'manager_reviewed',
      manager_reviewed_at: new Date().toISOString(),
      final_score: finalScore,
    });

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to submit review", variant: "destructive" });
    } else {
      toast({ title: "Submitted", description: "Review submitted successfully" });
      setAssessment(prev => prev ? { ...prev, status: 'manager_reviewed' } : null);
    }
  };

  const updateIndicator = (indicatorId: string, updates: Partial<IndicatorData>) => {
    setSections(prev => prev.map(section => ({
      ...section,
      indicators: section.indicators.map(indicator => {
        if (indicator.id !== indicatorId) return indicator;
        return { ...indicator, ...updates };
      })
    })));
  };

  const updateAssessmentStatus = (status: string) => {
    setAssessment(prev => prev ? { ...prev, status } : null);
  };

  return {
    assessment,
    sections,
    loading,
    saving,
    saveDraft,
    submitAssessment,
    submitReview,
    updateIndicator,
    updateAssessmentStatus,
    managerFeedback,
    setManagerFeedback,
  };
}

export function useMyAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchAssessments() {
      const { data, error } = await api.getAssessments({ staffId: user!.id });

      if (error) {
        console.error('Error fetching assessments:', error);
      } else {
        setAssessments((data as Assessment[]) || []);
      }
      setLoading(false);
    }

    fetchAssessments();
  }, [user]);

  const createAssessment = async (templateId: string, period: string) => {
    if (!user) return null;

    const { data, error } = await api.createAssessment({
      template_id: templateId,
      period,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
      return null;
    }

    const newAssessment = data as Assessment;
    setAssessments(prev => [newAssessment, ...prev]);
    return newAssessment;
  };

  return { assessments, loading, createAssessment };
}

export function useTeamAssessments() {
  const { user } = useAuth();
  const [assessments, setAssessments] = useState<(Assessment & { staff_name?: string; staff_email?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function fetchTeamAssessments() {
      // API currently handles general listing, we might need more specific filters later
      // For now, get all assessments and we'll filter them as needed or expect the API to handle permissions
      const { data, error } = await api.getAssessments();

      if (error) {
        console.error('Error fetching team assessments:', error);
      } else {
        setAssessments((data as any[]) || []);
      }
      setLoading(false);
    }

    fetchTeamAssessments();
  }, [user]);

  return { assessments, loading };
}

export function calculateWeightedScore(sections: SectionData[] | undefined | null, type: 'staff' | 'manager' = 'staff'): number | null {
  if (!sections || !Array.isArray(sections)) return null;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const section of sections) {
    const scoredIndicators = section.indicators?.filter(i => (type === 'staff' ? i.score : i.managerScore) !== null) || [];
    if (scoredIndicators.length === 0) continue;

    const sectionAvg = scoredIndicators.reduce((sum, i) => sum + ((type === 'staff' ? i.score : i.managerScore) || 0), 0) / scoredIndicators.length;
    weightedSum += sectionAvg * section.weight;
    totalWeight += section.weight;
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

export function getGradeFromScore(score: number): string {
  if (score > 3.71) return 'A+';
  if (score > 3.41) return 'A';
  if (score > 3.11) return 'B+';
  if (score > 2.81) return 'B';
  if (score > 2.51) return 'C+';
  if (score > 2.21) return 'C';
  if (score > 2.00) return 'D';
  return 'F';
}
