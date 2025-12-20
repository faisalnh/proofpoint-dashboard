import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Users, CheckCircle, Send, User, Link, FileText, Download, Zap, Loader2, TrendingUp, Clock, UserCheck } from "lucide-react";
import { generateAppraisalPdf } from "@/lib/generateAppraisalPdf";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useTeamAssessments, calculateWeightedScore, getGradeFromScore, SectionData, ScoreOption, EvidenceItem } from "@/hooks/useAssessment";
import { supabase } from "@/integrations/supabase/client";
import { ScoreSelector } from "@/components/assessment/ScoreSelector";
import { QuestionsPanel } from "@/components/assessment/QuestionsPanel";
import { AssessmentProgress } from "@/components/assessment/AssessmentProgress";
import { getStatusLabel } from "@/lib/assessmentStatus";

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
  managerNotes: string;
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
  const [staffProfile, setStaffProfile] = useState<{ full_name: string; department_name: string } | null>(null);
  const [managerProfile, setManagerProfile] = useState<{ full_name: string } | null>(null);

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
          managerNotes: (data as any).manager_notes || '',
        });
      }

      setLoading(false);
    }

    fetchAssessment();
  }, [assessmentId]);

  useEffect(() => {
    if (!reviewData?.assessment) return;
    
    async function fetchProfiles() {
      const staffId = reviewData.assessment.staff_id;
      const managerId = reviewData.assessment.manager_id || user?.id;
      
      const { data: staffData } = await supabase
        .from('profiles')
        .select('full_name, departments(name)')
        .eq('user_id', staffId)
        .single();
      
      if (staffData) {
        setStaffProfile({
          full_name: staffData.full_name || 'Staff Member',
          department_name: (staffData.departments as any)?.name || 'N/A'
        });
      }
      
      if (managerId) {
        const { data: managerData } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', managerId)
          .single();
        
        if (managerData) {
          setManagerProfile({ full_name: managerData.full_name || 'Manager' });
        }
      }
    }
    
    fetchProfiles();
  }, [reviewData?.assessment, user?.id]);

  const handleDownloadReport = () => {
    if (!reviewData || !managerScore) {
      toast({ title: "Cannot generate report", description: "Manager score is incomplete", variant: "destructive" });
      return;
    }
    
    const pdfData = {
      staffName: staffProfile?.full_name || 'Staff Member',
      managerName: managerProfile?.full_name || user?.email || 'Manager',
      directorName: 'Director',
      department: staffProfile?.department_name || 'N/A',
      period: reviewData.assessment.period,
      sections: managerSections.map(s => ({
        name: s.name,
        weight: s.weight,
        indicators: s.indicators.map(i => ({
          name: i.name,
          score: i.score
        }))
      })),
      totalScore: managerScore,
      grade: getGradeFromScore(managerScore)
    };
    
    generateAppraisalPdf(pdfData);
  };

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

  const handleManagerNotesChange = (notes: string) => {
    if (!reviewData) return;
    setReviewData({ ...reviewData, managerNotes: notes });
  };

  const handleSave = async () => {
    if (!reviewData || !assessmentId) return;

    setSaving(true);
    const { error } = await supabase
      .from('assessments')
      .update({
        manager_scores: reviewData.managerScores,
        manager_evidence: reviewData.managerEvidence,
        manager_notes: reviewData.managerNotes,
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
        manager_notes: reviewData.managerNotes,
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
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
        <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />
        <Header />
        <main className="container py-8">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-30 animate-pulse" />
              <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Loading team assessments...</p>
          </div>
        </main>
      </div>
    );
  }

  // No assessment selected - show team list
  if (!assessmentId) {
    const pendingAssessments = assessments.filter(a => a.status === 'self_submitted');
    const inProgressAssessments = assessments.filter(a => a.status === 'manager_reviewed');
    const completedAssessments = assessments.filter(a => ['approved', 'acknowledged'].includes(a.status));
    
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
        <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />
        <div className="fixed top-[20%] right-[10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" />
        <div className="fixed bottom-[20%] left-[5%] w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '-3s' }} />
        
        <Header />
        <main className="container relative py-8">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-3.5 w-3.5" />
                <span>Manager Dashboard</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              Team Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">Review and score your team's assessments</p>
          </div>

          <div className="space-y-6">
            {/* Pending Reviews */}
            <Card className="glass-panel border-border/30 overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-amber-500/30 via-amber-500 to-amber-500/30" />
              <CardHeader>
                <CardTitle className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <span>Pending Reviews</span>
                  <Badge variant="secondary" className="ml-auto">{pendingAssessments.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingAssessments.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle className="h-8 w-8 text-muted-foreground" />
                    </div>
                    <p className="text-muted-foreground">No assessments pending review</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingAssessments.map(a => (
                      <div
                        key={a.id}
                        className="group flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30 hover:border-amber-500/30 hover:bg-background/80 cursor-pointer transition-all duration-300 hover:shadow-lg"
                        onClick={() => navigate(`/manager?id=${a.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <User className="h-6 w-6 text-amber-600" />
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-amber-600 transition-colors">{a.staff_name}</div>
                            <div className="text-sm text-muted-foreground">{a.period}</div>
                          </div>
                        </div>
                        <Badge className="bg-amber-500/10 text-amber-600 border border-amber-500/20">
                          {getStatusLabel(a.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Awaiting Director */}
            {inProgressAssessments.length > 0 && (
              <Card className="glass-panel border-border/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <TrendingUp className="h-5 w-5 text-primary" />
                    </div>
                    <span>Awaiting Director Approval</span>
                    <Badge variant="secondary" className="ml-auto">{inProgressAssessments.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {inProgressAssessments.map(a => (
                      <div
                        key={a.id}
                        className="group flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-background/80 cursor-pointer transition-all duration-300 hover:shadow-lg"
                        onClick={() => navigate(`/manager?id=${a.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <User className="h-6 w-6 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-primary transition-colors">{a.staff_name}</div>
                            <div className="text-sm text-muted-foreground">{a.period}</div>
                          </div>
                        </div>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {getStatusLabel(a.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Completed */}
            {completedAssessments.length > 0 && (
              <Card className="glass-panel border-border/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-score-3/30 via-score-3 to-score-3/30" />
                <CardHeader>
                  <CardTitle className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-score-3/10 flex items-center justify-center">
                      <CheckCircle className="h-5 w-5 text-score-3" />
                    </div>
                    <span>Completed</span>
                    <Badge variant="secondary" className="ml-auto">{completedAssessments.length}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {completedAssessments.map(a => (
                      <div
                        key={a.id}
                        className="group flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30 hover:border-score-3/30 hover:bg-background/80 cursor-pointer transition-all duration-300 hover:shadow-lg"
                        onClick={() => navigate(`/manager?id=${a.id}`)}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-score-3/10 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <CheckCircle className="h-6 w-6 text-score-3" />
                          </div>
                          <div>
                            <div className="font-medium group-hover:text-score-3 transition-colors">{a.staff_name}</div>
                            <div className="text-sm text-muted-foreground">{a.period}</div>
                          </div>
                        </div>
                        <Badge className="bg-score-3/10 text-score-3 border border-score-3/20">
                          {getStatusLabel(a.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </main>
      </div>
    );
  }

  if (!reviewData) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
        <Header />
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Assessment not found</p>
            <Button variant="outline" onClick={() => navigate('/manager')} className="mt-4">
              Back to Team
            </Button>
          </div>
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
  
  const isReadOnly = reviewData.assessment.status !== 'self_submitted';

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Background Effects */}
      <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
      <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />
      <div className="fixed top-[30%] right-[5%] w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" />
      <div className="fixed bottom-[20%] left-[5%] w-64 h-64 bg-primary/10 rounded-full blur-3xl pointer-events-none animate-float" style={{ animationDelay: '-2s' }} />
      
      <Header />
      
      <main className="container relative py-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate('/manager')} 
          className="mb-6 group hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Team
        </Button>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-2">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
              <UserCheck className="h-3.5 w-3.5" />
              <span>Manager Review</span>
            </div>
            {staffProfile && (
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/30 text-sm">
                <User className="h-3.5 w-3.5 text-muted-foreground" />
                <span>{staffProfile.full_name}</span>
              </div>
            )}
          </div>
          <h1 className="text-4xl font-bold text-foreground tracking-tight">Performance Review</h1>
          <p className="text-muted-foreground mt-1">Compare staff self-assessment with your evaluation</p>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-6 glass-panel border-border/30 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
          <CardContent className="py-5">
            <AssessmentProgress status={reviewData.assessment.status} />
          </CardContent>
        </Card>

        {/* Score Summary */}
        <div className="grid grid-cols-2 gap-4 mb-8">
          <Card className="glass-panel border-border/30">
            <CardContent className="py-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center">
                    <User className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">Staff Score</p>
                </div>
                <p className="text-4xl font-mono font-bold text-foreground">
                  {staffScore?.toFixed(2) || '--'}
                </p>
                {staffScore && (
                  <Badge variant="outline" className="mt-3 text-base px-4 py-1">{getGradeFromScore(staffScore)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
          <Card className="glass-panel border-primary/30 bg-primary/5 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-primary/50 via-primary to-primary/50" />
            <CardContent className="py-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <UserCheck className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-sm font-medium text-primary">Manager Score</p>
                </div>
                <p className="text-4xl font-mono font-bold text-primary">
                  {managerScore?.toFixed(2) || '--'}
                </p>
                {managerScore && (
                  <Badge className="mt-3 text-base px-4 py-1 glow-primary">{getGradeFromScore(managerScore)}</Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Split View */}
        <div className="space-y-6">
          {reviewData.sections.map(section => (
            <Card key={section.id} className="glass-panel border-border/30 overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-transparent border-b border-border/30">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-lg">{section.name}</span>
                  <Badge variant="outline" className="font-mono">{section.weight}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {section.indicators.map((indicator, idx) => (
                  <div key={indicator.id} className={cn("border-b border-border/30 last:border-0", idx % 2 === 0 && "bg-muted/10")}>
                    <div className="p-5">
                      <h4 className="font-semibold mb-1">{indicator.name}</h4>
                      <p className="text-sm text-muted-foreground mb-5">{indicator.description}</p>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Staff Side */}
                        <div className="space-y-3 p-4 rounded-xl bg-muted/20 border border-border/30">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                            <User className="h-3.5 w-3.5" />
                            Staff Assessment
                          </p>
                          <div className="flex items-center gap-2">
                            <span className="text-sm">Score:</span>
                            <Badge variant={indicator.score !== null && indicator.score <= 1 ? 'destructive' : indicator.score !== null && indicator.score >= 3 ? 'default' : 'secondary'}>
                              {indicator.score !== null ? indicator.score : '--'}/4
                            </Badge>
                          </div>
                          {renderEvidence(indicator.evidence) && (
                            <div className="p-3 bg-background/50 rounded-lg text-sm border border-border/30">
                              <p className="text-xs text-muted-foreground mb-2 font-medium">Evidence:</p>
                              {renderEvidence(indicator.evidence)}
                            </div>
                          )}
                        </div>

                        {/* Manager Side */}
                        <div className="space-y-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
                          <p className="text-xs font-semibold text-primary uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="h-3.5 w-3.5" />
                            Manager Assessment
                          </p>
                          <ScoreSelector
                            value={reviewData.managerScores[indicator.id] ?? null}
                            onChange={(score) => handleScoreChange(indicator.id, score)}
                            scoreOptions={indicator.score_options}
                            disabled={isReadOnly}
                          />
                          <Textarea
                            placeholder="Add notes or justification..."
                            value={reviewData.managerEvidence[indicator.id] || ''}
                            onChange={(e) => handleEvidenceChange(indicator.id, e.target.value)}
                            className="min-h-[80px] bg-background/50 border-border/50"
                            disabled={isReadOnly}
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

        {/* Staff Questions */}
        <div className="mt-8">
          <QuestionsPanel
            assessmentId={assessmentId}
            indicators={reviewData.sections.flatMap(s => 
              s.indicators.map(i => ({ id: i.id, name: i.name }))
            )}
          />
        </div>

        {/* Overall Manager Notes */}
        <Card className="mt-8 glass-panel border-border/30 overflow-hidden">
          <div className="h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              Overall Manager Notes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Add overall notes, recommendations, or feedback for this assessment..."
              value={reviewData.managerNotes}
              onChange={(e) => handleManagerNotesChange(e.target.value)}
              rows={4}
              className="resize-none bg-background/50 border-border/50"
              disabled={isReadOnly}
            />
          </CardContent>
        </Card>

        {/* Actions */}
        {reviewData.assessment.status === 'self_submitted' && (
          <Card className="mt-8 glass-panel border-border/30 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            <CardContent className="py-4">
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={handleSave} disabled={saving} className="glass-panel border-border/30">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  {saving ? "Saving..." : "Save Progress"}
                </Button>
                <Button onClick={handleSubmitReview} disabled={saving} className="glow-primary">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Review
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Download Report */}
        {isReadOnly && managerScore && (
          <Card className="mt-8 glass-panel border-score-3/30 bg-score-3/5 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-score-3/30 via-score-3 to-score-3/30" />
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-score-3/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-score-3" />
                  </div>
                  <div>
                    <p className="font-medium text-score-3">Review Complete</p>
                    <p className="text-sm text-muted-foreground">Download the performance report</p>
                  </div>
                </div>
                <Button variant="outline" onClick={handleDownloadReport} className="glass-panel border-border/30 hover:border-score-3/30">
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
