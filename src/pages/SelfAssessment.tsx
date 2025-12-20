import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { AssessmentSection, WeightedScoreDisplay, ReviewComparisonSection, ReviewSectionData } from "@/components/assessment";
import { RaiseQuestionModal } from "@/components/assessment/RaiseQuestionModal";
import { MyQuestionsPanel } from "@/components/assessment/MyQuestionsPanel";
import { AssessmentProgress } from "@/components/assessment/AssessmentProgress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Send, Save, Calendar, Briefcase, ShieldCheck, Plus, ArrowLeft, CheckCircle, MessageSquare, User, UserCheck, Clock, FileDown, Zap, Loader2, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAssessment, useMyAssessments, useRubricTemplates, SectionData, IndicatorData, hasValidEvidence, getGradeFromScore } from "@/hooks/useAssessment";
import { supabase } from "@/integrations/supabase/client";
import { getStatusLabel } from "@/lib/assessmentStatus";
import { generateAppraisalPdf } from "@/lib/generateAppraisalPdf";

function validateSections(sections: SectionData[]): { valid: boolean; missing: number } {
  let missing = 0;
  
  for (const section of sections) {
    for (const indicator of section.indicators) {
      if (indicator.score === null) {
        missing++;
        continue;
      }
      // Score 1-4 require evidence (score 0 does not)
      if (indicator.score >= 1 && !hasValidEvidence(indicator.evidence)) {
        missing++;
      }
    }
  }
  
  return { valid: missing === 0, missing };
}

export default function SelfAssessment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');
  const { profile } = useAuth();
  
  const { templates, loading: templatesLoading } = useRubricTemplates(profile?.department_id || undefined);
  const { assessments, loading: assessmentsLoading, createAssessment } = useMyAssessments();
  const { assessment, sections, loading: assessmentLoading, saving, saveDraft, submitAssessment, updateIndicator, updateAssessmentStatus } = useAssessment(assessmentId || undefined);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [creating, setCreating] = useState(false);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);

  // Auto-detect review period based on current date
  const getDefaultPeriod = () => {
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    
    if (month >= 5 && month <= 8) {
      return `Semester 2, ${year - 1}-${year} Academic Year`;
    } else if (month >= 11 || month <= 2) {
      if (month >= 11) {
        return `Semester 1, ${year}-${year + 1} Academic Year`;
      } else {
        return `Semester 1, ${year - 1}-${year} Academic Year`;
      }
    } else {
      if (month >= 9) {
        return `Semester 1, ${year}-${year + 1} Academic Year`;
      } else {
        return `Semester 2, ${year - 1}-${year} Academic Year`;
      }
    }
  };
  
  const [period, setPeriod] = useState(getDefaultPeriod);

  const validation = useMemo(() => validateSections(sections), [sections]);

  // Convert sections to review format for comparison view
  const reviewSections: ReviewSectionData[] = useMemo(() => {
    return sections.map(section => ({
      id: section.id,
      name: section.name,
      weight: section.weight,
      indicators: section.indicators.map(indicator => ({
        id: indicator.id,
        name: indicator.name,
        description: indicator.description,
        score_options: indicator.score_options,
        evidence_guidance: indicator.evidence_guidance || undefined,
        staffScore: indicator.score,
        staffEvidence: indicator.evidence,
        managerScore: indicator.managerScore ?? null,
        managerEvidence: indicator.managerEvidence ?? '',
      }))
    }));
  }, [sections]);

  const handleIndicatorChange = (sectionId: string, indicatorId: string, updates: Partial<IndicatorData>) => {
    updateIndicator(sectionId, indicatorId, updates);
  };

  const handleCreateAssessment = async () => {
    if (!selectedTemplate || !period) {
      toast({ title: "Error", description: "Please select a template and period", variant: "destructive" });
      return;
    }
    
    setCreating(true);
    const newAssessment = await createAssessment(selectedTemplate, period);
    setCreating(false);
    
    if (newAssessment) {
      navigate(`/assessment?id=${newAssessment.id}`);
    }
  };

  const handleRaiseQuestion = () => {
    setQuestionModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!validation.valid) {
      toast({
        title: "Cannot Submit",
        description: `${validation.missing} indicator(s) require completion or evidence.`,
        variant: "destructive"
      });
      return;
    }
    
    await submitAssessment();
  };

  const handleAcknowledge = async () => {
    if (!assessment) return;

    const { error } = await supabase
      .from('assessments')
      .update({
        status: 'acknowledged',
        updated_at: new Date().toISOString(),
      })
      .eq('id', assessment.id);

    if (error) {
      toast({ title: "Error", description: "Failed to acknowledge", variant: "destructive" });
    } else {
      updateAssessmentStatus('acknowledged');
      toast({ title: "Acknowledged", description: "Assessment acknowledged successfully" });
      handleGeneratePdf();
    }
  };

  const handleGeneratePdf = async () => {
    if (!assessment) return;

    const { data: assessmentData } = await supabase
      .from('assessments')
      .select('staff_id, manager_id, director_id')
      .eq('id', assessment.id)
      .single();

    let staffName = 'Staff Member';
    let managerName = 'Manager';
    let directorName = 'Director';
    let departmentName = '';

    if (assessmentData) {
      const userIds = [assessmentData.staff_id, assessmentData.manager_id, assessmentData.director_id].filter(Boolean);
      if (userIds.length > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name, department_id')
          .in('user_id', userIds);

        if (profiles) {
          const staffProfile = profiles.find(p => p.user_id === assessmentData.staff_id);
          const managerProfile = profiles.find(p => p.user_id === assessmentData.manager_id);
          const directorProfile = profiles.find(p => p.user_id === assessmentData.director_id);
          
          if (staffProfile?.full_name) staffName = staffProfile.full_name;
          if (managerProfile?.full_name) managerName = managerProfile.full_name;
          if (directorProfile?.full_name) directorName = directorProfile.full_name;

          if (staffProfile?.department_id) {
            const { data: dept } = await supabase
              .from('departments')
              .select('name')
              .eq('id', staffProfile.department_id)
              .single();
            if (dept?.name) departmentName = dept.name;
          }
        }
      }
    }

    const managerScore = sections.reduce((acc, s) => {
      const scored = s.indicators.filter(i => i.managerScore !== null);
      if (scored.length === 0) return acc;
      return acc + scored.reduce((sum, i) => sum + (i.managerScore || 0), 0) / scored.length * s.weight / 100;
    }, 0);

    generateAppraisalPdf({
      staffName,
      managerName,
      directorName,
      department: departmentName,
      period: assessment.period,
      sections: sections.map(s => ({
        name: s.name,
        weight: s.weight,
        indicators: s.indicators.map(i => ({
          name: i.name,
          score: i.managerScore ?? null,
        })),
      })),
      totalScore: managerScore,
      grade: getGradeFromScore(managerScore),
    });
  };

  // Loading state
  if (templatesLoading || assessmentsLoading) {
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
            <p className="text-muted-foreground">Loading assessments...</p>
          </div>
        </main>
      </div>
    );
  }

  // No assessment selected - show list or create new
  if (!assessmentId) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
        <div className="fixed inset-0 mesh-gradient opacity-30 pointer-events-none" />
        <div className="fixed top-[20%] right-[10%] w-96 h-96 bg-primary/5 rounded-full blur-3xl pointer-events-none animate-float" />
        
        <Header />
        <main className="container relative py-8">
          {/* Page Header */}
          <div className="mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-sm font-medium">
                <Zap className="h-3.5 w-3.5" />
                <span>Self-Assessment</span>
              </div>
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">Performance Evaluation</h1>
            <p className="text-muted-foreground mt-2">View your assessments or start a new evaluation cycle</p>
          </div>

          {/* Create New Card */}
          <Card className="mb-8 glass-panel border-border/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Plus className="h-5 w-5 text-primary" />
                </div>
                <span>Start New Assessment</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Rubric Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger className="bg-background/50 border-border/50">
                      <SelectValue placeholder="Select template" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map(t => (
                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Review Period</label>
                  <Input 
                    value={period} 
                    onChange={(e) => setPeriod(e.target.value)} 
                    placeholder="e.g., Q4 2024" 
                    className="bg-background/50 border-border/50"
                  />
                </div>
                <div className="flex items-end">
                  <Button 
                    onClick={handleCreateAssessment} 
                    disabled={creating || !selectedTemplate}
                    className="w-full glow-primary hover:scale-[1.02] transition-all duration-300"
                  >
                    {creating ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-2" />
                    )}
                    {creating ? "Creating..." : "Create Assessment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Assessments */}
          <Card className="glass-panel border-border/30 overflow-hidden">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                My Assessments
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <div className="text-center py-12">
                  <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-4">
                    <Briefcase className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <p className="text-muted-foreground">No assessments yet. Create your first one above.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {assessments.map(a => (
                    <div
                      key={a.id}
                      className="group flex items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30 hover:border-primary/30 hover:bg-background/80 cursor-pointer transition-all duration-300 hover:shadow-lg"
                      onClick={() => navigate(`/assessment?id=${a.id}`)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium group-hover:text-primary transition-colors">{a.period}</div>
                          <div className="text-sm text-muted-foreground">
                            Created {new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </div>
                        </div>
                      </div>
                      <Badge variant={a.status === 'draft' ? 'outline' : a.status === 'approved' || a.status === 'acknowledged' ? 'default' : 'secondary'}>
                        {getStatusLabel(a.status)}
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

  // Assessment loading
  if (assessmentLoading) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
        <Header />
        <main className="container py-8">
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-30 animate-pulse" />
              <Loader2 className="relative h-10 w-10 animate-spin text-primary" />
            </div>
            <p className="text-muted-foreground">Loading assessment...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background relative overflow-hidden">
        <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
        <Header />
        <main className="container py-8">
          <div className="text-center py-12">
            <p className="text-muted-foreground">Assessment not found</p>
            <Button variant="outline" onClick={() => navigate('/assessment')} className="mt-4">
              Back to Assessments
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const isEditable = assessment.status === 'draft';
  const showAcknowledge = assessment.status === 'approved';
  const isReviewed = ['manager_reviewed', 'approved', 'acknowledged'].includes(assessment.status);

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
          onClick={() => navigate('/assessment')} 
          className="mb-6 group hover:bg-muted/50"
        >
          <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform" />
          Back to Assessments
        </Button>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/30">
              <Briefcase className="h-3.5 w-3.5" />
              <span>Assessment</span>
            </div>
            <span className="text-border">•</span>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/50 border border-border/30">
              <Calendar className="h-3.5 w-3.5" />
              <span>{assessment.period}</span>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-4xl font-bold text-foreground tracking-tight">Self-Assessment</h1>
              <p className="text-muted-foreground mt-1">
                Rate your performance honestly. Remember: <span className="font-semibold text-primary">No Evidence, No Score.</span>
              </p>
            </div>
            
            <Badge 
              variant={isEditable ? 'outline' : 'secondary'} 
              className="gap-1.5 py-2 px-4 text-sm glass-panel border-border/30"
            >
              <ShieldCheck className="h-4 w-4" />
              {getStatusLabel(assessment.status)}
            </Badge>
          </div>
          
          {/* Progress Indicator */}
          <Card className="mt-6 glass-panel border-border/30 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            <CardContent className="py-5">
              <AssessmentProgress status={assessment.status} />
            </CardContent>
          </Card>
        </div>

        {/* Status-specific Notices */}
        {assessment.status === 'manager_reviewed' && (
          <Card className="mb-6 glass-panel border-amber-500/30 bg-amber-500/5 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-amber-500/30 via-amber-500 to-amber-500/30" />
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <p className="font-medium">Waiting for Director Approval</p>
                  <p className="text-sm text-muted-foreground">Manager has completed the review. Pending director approval.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {assessment.status === 'approved' && (
          <Card className="mb-6 glass-panel border-primary/30 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">Director Approved</p>
                    <p className="text-sm text-muted-foreground">Review the scores below and acknowledge or raise questions</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={handleRaiseQuestion} className="glass-panel border-border/30">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Raise Question
                  </Button>
                  <Button size="sm" onClick={handleAcknowledge} className="glow-primary">
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {assessment.status === 'acknowledged' && (
          <Card className="mb-6 glass-panel border-score-3/30 bg-score-3/5 overflow-hidden">
            <div className="h-0.5 bg-gradient-to-r from-score-3/30 via-score-3 to-score-3/30" />
            <CardContent className="py-4">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-score-3/10 flex items-center justify-center">
                    <CheckCircle className="h-5 w-5 text-score-3" />
                  </div>
                  <div>
                    <p className="font-medium text-score-3">Assessment Complete</p>
                    <p className="text-sm text-muted-foreground">You have acknowledged this assessment</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleGeneratePdf} className="glass-panel border-border/30">
                  <FileDown className="h-4 w-4 mr-2" />
                  Download Report
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assessment Form / Review Comparison */}
          <div className="lg:col-span-8 space-y-6">
            {isReviewed ? (
              <>
                {/* Score Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card className="glass-panel border-border/30">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center">
                          <User className="h-4 w-4 text-muted-foreground" />
                        </div>
                        <span className="text-sm font-medium">Self Assessment</span>
                      </div>
                      {(() => {
                        const selfScore = sections.reduce((acc, s) => {
                          const scored = s.indicators.filter(i => i.score !== null);
                          if (scored.length === 0) return acc;
                          return acc + scored.reduce((sum, i) => sum + (i.score || 0), 0) / scored.length * s.weight / 100;
                        }, 0);
                        return (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold font-mono">{selfScore.toFixed(2)}</span>
                            <span className="text-lg font-semibold text-muted-foreground">({getGradeFromScore(selfScore)})</span>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                  <Card className="glass-panel border-primary/30 bg-primary/5">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <UserCheck className="h-4 w-4 text-primary" />
                        </div>
                        <span className="text-sm font-medium text-primary">Manager Review</span>
                      </div>
                      {(() => {
                        const managerScore = sections.reduce((acc, s) => {
                          const scored = s.indicators.filter(i => i.managerScore !== null);
                          if (scored.length === 0) return acc;
                          return acc + scored.reduce((sum, i) => sum + (i.managerScore || 0), 0) / scored.length * s.weight / 100;
                        }, 0);
                        return (
                          <div className="flex items-baseline gap-2">
                            <span className="text-3xl font-bold font-mono text-primary">{managerScore.toFixed(2)}</span>
                            <span className="text-lg font-semibold text-primary/70">({getGradeFromScore(managerScore)})</span>
                          </div>
                        );
                      })()}
                    </CardContent>
                  </Card>
                </div>
                
                {reviewSections.map(section => (
                  <ReviewComparisonSection
                    key={section.id}
                    section={section}
                  />
                ))}
              </>
            ) : (
              sections.map(section => (
                <AssessmentSection
                  key={section.id}
                  section={section}
                  onIndicatorChange={(indicatorId, updates) => 
                    handleIndicatorChange(section.id, indicatorId, updates)
                  }
                  readonly={!isEditable}
                />
              ))
            )}
            
            {/* Submit Section */}
            {isEditable && (
              <Card className="glass-panel border-border/30 overflow-hidden">
                <div className="h-0.5 bg-gradient-to-r from-primary/30 via-primary to-primary/30" />
                <CardContent className="py-4">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div>
                      {validation.valid ? (
                        <p className="text-sm text-score-3 font-medium flex items-center gap-2">
                          <ShieldCheck className="h-4 w-4" />
                          All requirements met. Ready to submit.
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium text-evidence-alert">{validation.missing}</span> indicator(s) need completion or evidence
                        </p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="outline" 
                        onClick={saveDraft}
                        disabled={saving}
                        className="glass-panel border-border/30"
                      >
                        <Save className="h-4 w-4 mr-2" />
                        {saving ? "Saving..." : "Save Draft"}
                      </Button>
                      <Button 
                        onClick={handleSubmit}
                        disabled={!validation.valid || saving}
                        className={cn(
                          "glow-primary",
                          !validation.valid && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <Send className="h-4 w-4 mr-2" />
                        Submit Assessment
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
          
          {/* Score Panel */}
          <div className="lg:col-span-4">
            <div className="sticky top-24 space-y-4">
              {!isReviewed && <WeightedScoreDisplay sections={sections} />}
              
              {/* Legend for Review */}
              {isReviewed && (
                <Card className="glass-panel border-border/30">
                  <CardContent className="py-4">
                    <h4 className="font-medium mb-3">Score Legend</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span>Self Assessment Score</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span>Manager Review Score</span>
                      </div>
                      <hr className="my-3 border-border/50" />
                      <p className="text-muted-foreground text-xs">
                        Compare your self-assessment with your manager's review. 
                        Green indicates higher scores, red indicates lower.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* My Questions */}
              {isReviewed && assessment && (
                <MyQuestionsPanel
                  assessmentId={assessment.id}
                  indicators={sections.flatMap(s => 
                    s.indicators.map(i => ({ id: i.id, name: i.name }))
                  )}
                />
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Raise Question Modal */}
      {assessment && (
        <RaiseQuestionModal
          open={questionModalOpen}
          onOpenChange={setQuestionModalOpen}
          assessmentId={assessment.id}
          sections={sections.map(s => ({
            id: s.id,
            name: s.name,
            indicators: s.indicators.map(i => ({ id: i.id, name: i.name }))
          }))}
        />
      )}
    </div>
  );
}
