import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Users, CheckCircle, Send, User, Link, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTeamAssessments, calculateWeightedScore, getGradeFromScore, SectionData, ScoreOption, EvidenceItem } from "@/hooks/useAssessment";
import { supabase } from "@/integrations/supabase/client";
import { ScoreSelector } from "@/components/assessment/ScoreSelector";

// Helper to render evidence
function renderEvidence(evidence: string | EvidenceItem[]): React.ReactNode {
  if (Array.isArray(evidence)) {
    const items = evidence.filter(e => e.evidence.trim().length > 0);
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-start gap-2 text-sm">
            <span className="font-mono text-xs text-muted-foreground">{idx + 1}.</span>
            <div className="flex-1">
              <div className="flex items-center gap-1">
                <Link className="h-3 w-3 text-muted-foreground" />
                <span>{item.evidence}</span>
              </div>
              {item.notes && (
                <p className="text-muted-foreground text-xs mt-1">{item.notes}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }
  return typeof evidence === 'string' && evidence.trim() ? evidence : null;
}

interface ManagerReviewData {
  assessment: any;
  sections: SectionData[];
  managerScores: Record<string, number>;
  managerEvidence: Record<string, string>;
}

export default function ManagerReview() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');
  const { user } = useAuth();
  const { assessments, loading: assessmentsLoading } = useTeamAssessments();
  
  const [reviewData, setReviewData] = useState<ManagerReviewData | null>(null);
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

      if (error || !data) {
        console.error('Error:', error);
        setLoading(false);
        return;
      }

      // Fetch template with sections
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
        const managerScores = (data.manager_scores || {}) as Record<string, number>;
        const managerEvidence = (data.manager_evidence || {}) as Record<string, string>;

        const sections = (templateData.rubric_sections || [])
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

        setReviewData({
          assessment: data,
          sections,
          managerScores,
          managerEvidence,
        });
      }

      setLoading(false);
    }

    fetchAssessment();
  }, [assessmentId]);

  const handleScoreChange = (indicatorId: string, score: number) => {
    if (!reviewData) return;
    setReviewData({
      ...reviewData,
      managerScores: { ...reviewData.managerScores, [indicatorId]: score }
    });
  };

  const handleEvidenceChange = (indicatorId: string, evidence: string) => {
    if (!reviewData) return;
    setReviewData({
      ...reviewData,
      managerEvidence: { ...reviewData.managerEvidence, [indicatorId]: evidence }
    });
  };

  const handleSave = async () => {
    if (!reviewData || !assessmentId) return;

    setSaving(true);
    const { error } = await supabase
      .from('assessments')
      .update({
        manager_scores: reviewData.managerScores,
        manager_evidence: reviewData.managerEvidence,
        manager_id: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } else {
      toast({ title: "Saved", description: "Review saved successfully" });
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewData || !assessmentId) return;

    // Calculate final score
    const managerSections = reviewData.sections.map(s => ({
      ...s,
      indicators: s.indicators.map(i => ({
        ...i,
        score: reviewData.managerScores[i.id] ?? i.score,
      }))
    }));

    const finalScore = calculateWeightedScore(managerSections);
    const finalGrade = finalScore ? getGradeFromScore(finalScore) : null;

    setSaving(true);
    const { error } = await supabase
      .from('assessments')
      .update({
        manager_scores: reviewData.managerScores,
        manager_evidence: reviewData.managerEvidence,
        manager_id: user?.id,
        status: 'manager_reviewed',
        manager_reviewed_at: new Date().toISOString(),
        final_score: finalScore,
        final_grade: finalGrade,
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessmentId);

    setSaving(false);

    if (error) {
      toast({ title: "Error", description: "Failed to submit review", variant: "destructive" });
    } else {
      toast({ title: "Submitted", description: "Review submitted for staff acknowledgement" });
      navigate('/manager');
    }
  };

  if (loading || assessmentsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </main>
      </div>
    );
  }

  // No assessment selected - show team list
  if (!assessmentId) {
    const pendingAssessments = assessments.filter(a => a.status === 'self_submitted' || a.status === 'manager_reviewed');
    
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <Users className="h-8 w-8" />
              Team Dashboard
            </h1>
            <p className="text-muted-foreground mt-1">Review and score your team's assessments</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Pending Reviews</CardTitle>
            </CardHeader>
            <CardContent>
              {pendingAssessments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No assessments pending review</p>
              ) : (
                <div className="space-y-2">
                  {pendingAssessments.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/manager?id=${a.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">{a.staff_name}</div>
                          <div className="text-sm text-muted-foreground">{a.period}</div>
                        </div>
                      </div>
                      <Badge variant={a.status === 'self_submitted' ? 'secondary' : 'default'}>
                        {a.status === 'self_submitted' ? 'Awaiting Review' : 'Reviewed'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Assessment not found</p>
        </main>
      </div>
    );
  }

  const staffScore = calculateWeightedScore(reviewData.sections);
  const managerSections = reviewData.sections.map(s => ({
    ...s,
    indicators: s.indicators.map(i => ({
      ...i,
      score: reviewData.managerScores[i.id] ?? i.score,
    }))
  }));
  const managerScore = calculateWeightedScore(managerSections);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <Button variant="ghost" onClick={() => navigate('/manager')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Team
        </Button>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Manager Review</h1>
          <p className="text-muted-foreground mt-1">Compare staff self-assessment with your evaluation</p>
        </div>

        {/* Score Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card>
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Staff Score</p>
                <p className="text-3xl font-mono font-bold text-foreground">
                  {staffScore?.toFixed(2) || '--'}
                </p>
                {staffScore && (
                  <Badge variant="outline" className="mt-2">{getGradeFromScore(staffScore)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="border-primary">
            <CardContent className="py-4">
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-1">Manager Score</p>
                <p className="text-3xl font-mono font-bold text-primary">
                  {managerScore?.toFixed(2) || '--'}
                </p>
                {managerScore && (
                  <Badge className="mt-2">{getGradeFromScore(managerScore)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Split View */}
        <div className="space-y-6">
          {reviewData.sections.map(section => (
            <Card key={section.id}>
              <CardHeader className="bg-secondary/30">
                <CardTitle className="flex items-center justify-between">
                  <span>{section.name}</span>
                  <Badge variant="outline">{section.weight}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {section.indicators.map((indicator, idx) => (
                  <div key={indicator.id} className={cn("border-b last:border-0", idx % 2 === 0 && "bg-muted/20")}>
                    <div className="p-4">
                      <h4 className="font-medium mb-1">{indicator.name}</h4>
                      <p className="text-sm text-muted-foreground mb-4">{indicator.description}</p>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Staff Side */}
                        <div className="space-y-3">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Staff Assessment</p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Score:</span>
                            <Badge variant={indicator.score !== null && indicator.score <= 1 ? 'destructive' : indicator.score !== null && indicator.score >= 3 ? 'default' : 'secondary'}>
                              {indicator.score !== null ? indicator.score : '--'}/4
                            </Badge>
                          </div>
                          {renderEvidence(indicator.evidence) && (
                            <div className="p-3 bg-muted rounded-lg text-sm">
                              <p className="text-xs text-muted-foreground mb-1">Evidence:</p>
                              {renderEvidence(indicator.evidence)}
                            </div>
                          )}
                        </div>

                        {/* Manager Side */}
                        <div className="space-y-3 border-l pl-6">
                          <p className="text-xs font-medium text-primary uppercase tracking-wide">Manager Assessment</p>
                          <ScoreSelector
                            value={reviewData.managerScores[indicator.id] ?? null}
                            onChange={(score) => handleScoreChange(indicator.id, score)}
                            scoreOptions={indicator.score_options}
                          />
                          <Textarea
                            placeholder="Add notes or justification..."
                            value={reviewData.managerEvidence[indicator.id] || ''}
                            onChange={(e) => handleEvidenceChange(indicator.id, e.target.value)}
                            className="min-h-[80px]"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-8 p-4 bg-card border rounded-xl">
          <Button variant="outline" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Progress"}
          </Button>
          <Button onClick={handleSubmitReview} disabled={saving}>
            <Send className="h-4 w-4 mr-2" />
            Submit Review
          </Button>
        </div>
      </main>
    </div>
  );
}
