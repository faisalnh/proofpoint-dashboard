import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
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

// Helper to serialize evidence for storage
function serializeEvidence(evidence: string | EvidenceItem[]): EvidenceItem[] | string {
  if (Array.isArray(evidence)) {
    return evidence;
  }
  return evidence;
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

export function useRubricTemplates(departmentId?: string) {
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      const { data, error } = await supabase
        .from('rubric_templates')
        .select(`
          id, name, description, is_global, department_id,
          rubric_sections (
            id, name, weight, sort_order,
            rubric_indicators (
              id, name, description, evidence_guidance, score_options, sort_order
            )
          )
        `)
        .or(`is_global.eq.true${departmentId ? `,department_id.eq.${departmentId}` : ''}`);

      if (error) {
        console.error('Error fetching templates:', error);
        return;
      }

      const formatted = (data || []).map(t => ({
        id: t.id,
        name: t.name,
        description: t.description,
        sections: (t.rubric_sections || [])
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((s: any) => ({
            id: s.id,
            name: s.name,
            weight: Number(s.weight),
            sort_order: s.sort_order,
            indicators: (s.rubric_indicators || [])
              .sort((a: any, b: any) => a.sort_order - b.sort_order)
              .map((i: any) => ({
                id: i.id,
                name: i.name,
                description: i.description,
                evidence_guidance: i.evidence_guidance,
                score_options: i.score_options as ScoreOption[],
                sort_order: i.sort_order,
              }))
          }))
      }));

      setTemplates(formatted);
      setLoading(false);
    }

    fetchTemplates();
  }, [departmentId]);

  return { templates, loading };
}

export function useAssessment(assessmentId?: string) {
  const { user } = useAuth();
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [sections, setSections] = useState<SectionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!assessmentId) {
      setLoading(false);
      return;
    }

    async function fetchAssessment() {
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('id', assessmentId)
        .single();

      if (error) {
        console.error('Error fetching assessment:', error);
        setLoading(false);
        return;
      }

      setAssessment(data as Assessment);

      // Fetch rubric template with sections and indicators
      if (data.template_id) {
        const { data: templateData } = await supabase
          .from('rubric_templates')
          .select(`
            id, name,
            rubric_sections (
              id, name, weight, sort_order,
              rubric_indicators (
                id, name, description, evidence_guidance, score_options, sort_order
              )
            )
          `)
          .eq('id', data.template_id)
          .single();

        if (templateData) {
          const staffScores = (data.staff_scores || {}) as Record<string, number>;
          const staffEvidence = (data.staff_evidence || {}) as Record<string, string>;

          const formattedSections = (templateData.rubric_sections || [])
            .sort((a: any, b: any) => a.sort_order - b.sort_order)
            .map((s: any) => ({
              id: s.id,
              name: s.name,
              weight: Number(s.weight),
              indicators: (s.rubric_indicators || [])
                .sort((a: any, b: any) => a.sort_order - b.sort_order)
                .map((i: any) => ({
                  id: i.id,
                  name: i.name,
                  description: i.description || '',
                  evidence_guidance: i.evidence_guidance,
                  score_options: i.score_options as ScoreOption[],
                  score: staffScores[i.id] ?? null,
                  evidence: staffEvidence[i.id] || '',
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

    const { error } = await supabase
      .from('assessments')
      .update({
        staff_scores: staffScores as never,
        staff_evidence: staffEvidence as never,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessment.id);

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

    const { error } = await supabase
      .from('assessments')
      .update({
        staff_scores: staffScores as never,
        staff_evidence: staffEvidence as never,
        status: 'self_submitted',
        staff_submitted_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessment.id);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to submit assessment", variant: "destructive" });
    } else {
      toast({ title: "Submitted", description: "Assessment submitted for manager review" });
      setAssessment(prev => prev ? { ...prev, status: 'self_submitted' } : null);
    }
  };

  const updateIndicator = (sectionId: string, indicatorId: string, updates: Partial<IndicatorData>) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      return {
        ...section,
        indicators: section.indicators.map(indicator => {
          if (indicator.id !== indicatorId) return indicator;
          return { ...indicator, ...updates };
        })
      };
    }));
  };

  return {
    assessment,
    sections,
    loading,
    saving,
    saveDraft,
    submitAssessment,
    updateIndicator,
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
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .eq('staff_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching assessments:', error);
      } else {
        setAssessments((data || []) as Assessment[]);
      }
      setLoading(false);
    }

    fetchAssessments();
  }, [user]);

  const createAssessment = async (templateId: string, period: string) => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('assessments')
      .insert({
        staff_id: user.id,
        template_id: templateId,
        period,
        status: 'draft',
      })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to create assessment", variant: "destructive" });
      return null;
    }

    setAssessments(prev => [data as Assessment, ...prev]);
    return data as Assessment;
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
      // Get assessments where user is manager or all if admin
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .or(`manager_id.eq.${user.id},status.eq.self_submitted`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching team assessments:', error);
        setLoading(false);
        return;
      }

      // Fetch staff profiles
      const staffIds = [...new Set((data || []).map(a => a.staff_id))];
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', staffIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enriched = (data || []).map(a => ({
        ...a as Assessment,
        staff_name: profileMap.get(a.staff_id)?.full_name || 'Unknown',
        staff_email: profileMap.get(a.staff_id)?.email || '',
      }));

      setAssessments(enriched);
      setLoading(false);
    }

    fetchTeamAssessments();
  }, [user]);

  return { assessments, loading };
}

export function calculateWeightedScore(sections: SectionData[]): number | null {
  let totalWeight = 0;
  let weightedSum = 0;

  for (const section of sections) {
    const scoredIndicators = section.indicators.filter(i => i.score !== null);
    if (scoredIndicators.length === 0) continue;

    const sectionAvg = scoredIndicators.reduce((sum, i) => sum + (i.score || 0), 0) / scoredIndicators.length;
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
