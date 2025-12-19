import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { AssessmentSection, WeightedScoreDisplay, ReviewComparisonSection, ReviewSectionData } from "@/components/assessment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Send, Save, Calendar, Briefcase, ShieldCheck, Plus, ArrowLeft, CheckCircle, MessageSquare, User, UserCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { useAssessment, useMyAssessments, useRubricTemplates, SectionData, IndicatorData, hasValidEvidence } from "@/hooks/useAssessment";
import { supabase } from "@/integrations/supabase/client";

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
  const { assessment, sections, loading: assessmentLoading, saving, saveDraft, submitAssessment, updateIndicator } = useAssessment(assessmentId || undefined);

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [creating, setCreating] = useState(false);

  // Auto-detect review period based on current date
  // May-August: Semester 2 of previousYear - currentYear academic year
  // Nov-Feb: Semester 1 of currentYear - nextYear academic year
  const getDefaultPeriod = () => {
    const now = new Date();
    const month = now.getMonth() + 1; // 1-12
    const year = now.getFullYear();
    
    if (month >= 5 && month <= 8) {
      // May-August: Semester 2 of previous-current academic year
      return `Semester 2, ${year - 1}-${year} Academic Year`;
    } else if (month >= 11 || month <= 2) {
      // Nov-Feb: Semester 1
      if (month >= 11) {
        return `Semester 1, ${year}-${year + 1} Academic Year`;
      } else {
        // Jan-Feb belongs to academic year that started previous year
        return `Semester 1, ${year - 1}-${year} Academic Year`;
      }
    } else {
      // March-April, Sep-Oct: default to nearest semester
      if (month >= 9) {
        return `Semester 1, ${year}-${year + 1} Academic Year`;
      } else {
        return `Semester 2, ${year - 1}-${year} Academic Year`;
      }
    }
  };
  
  const [period, setPeriod] = useState(getDefaultPeriod);

  const validation = useMemo(() => validateSections(sections), [sections]);

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
      toast({ title: "Acknowledged", description: "Assessment acknowledged successfully" });
      navigate('/dashboard');
    }
  };

  // Loading state
  if (templatesLoading || assessmentsLoading) {
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

  // No assessment selected - show list or create new
  if (!assessmentId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Self-Assessment</h1>
            <p className="text-muted-foreground mt-1">View your assessments or start a new one</p>
          </div>

          {/* Create New */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Start New Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground mb-2 block">Rubric Template</label>
                  <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                    <SelectTrigger>
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
                  <Input value={period} onChange={(e) => setPeriod(e.target.value)} placeholder="e.g., Q4 2024" />
                </div>
                <div className="flex items-end">
                  <Button onClick={handleCreateAssessment} disabled={creating || !selectedTemplate}>
                    {creating ? "Creating..." : "Create Assessment"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Existing Assessments */}
          <Card>
            <CardHeader>
              <CardTitle>My Assessments</CardTitle>
            </CardHeader>
            <CardContent>
              {assessments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No assessments yet. Create your first one above.</p>
              ) : (
                <div className="space-y-2">
                  {assessments.map(a => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => navigate(`/assessment?id=${a.id}`)}
                    >
                      <div>
                        <div className="font-medium">{a.period}</div>
                        <div className="text-sm text-muted-foreground">Created {new Date(a.created_at).toLocaleDateString()}</div>
                      </div>
                      <Badge variant={a.status === 'draft' ? 'outline' : a.status === 'approved' ? 'default' : 'secondary'}>
                        {a.status.replace('_', ' ')}
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

  if (!assessment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Assessment not found</p>
        </main>
      </div>
    );
  }

  const isEditable = assessment.status === 'draft';
  const showAcknowledge = assessment.status === 'manager_reviewed' || assessment.status === 'director_approved';
  const isReviewed = ['manager_reviewed', 'director_approved', 'acknowledged'].includes(assessment.status);

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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        {/* Back Button */}
        <Button variant="ghost" onClick={() => navigate('/assessment')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>

        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Briefcase className="h-4 w-4" />
            <span>Assessment</span>
            <span className="text-border">•</span>
            <Calendar className="h-4 w-4" />
            <span>{assessment.period}</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Self-Assessment</h1>
              <p className="text-muted-foreground mt-1">
                Rate your performance honestly. Remember: <span className="font-medium text-foreground">No Evidence, No Score.</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant={isEditable ? 'outline' : 'secondary'} className="gap-1.5 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {assessment.status.replace('_', ' ')}
              </Badge>
            </div>
          </div>
        </div>

        {/* Manager Review Notice */}
        {showAcknowledge && (
          <Card className="mb-6 border-primary">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-primary" />
                  <div>
                    <p className="font-medium">Manager Review Complete</p>
                    <p className="text-sm text-muted-foreground">Review the scores below and acknowledge the assessment</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Raise Question
                  </Button>
                  <Button size="sm" onClick={handleAcknowledge}>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Acknowledge
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assessment Form / Review Comparison */}
          <div className="lg:col-span-8 space-y-6">
            {isReviewed ? (
              // Show comparison view when reviewed
              <>
                {/* Score Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <Card className="bg-muted/30">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Self Assessment</span>
                      </div>
                      <div className="text-2xl font-bold font-mono">
                        {sections.reduce((acc, s) => {
                          const scored = s.indicators.filter(i => i.score !== null);
                          if (scored.length === 0) return acc;
                          return acc + scored.reduce((sum, i) => sum + (i.score || 0), 0) / scored.length * s.weight / 100;
                        }, 0).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="py-4">
                      <div className="flex items-center gap-2 mb-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium text-primary">Manager Review</span>
                      </div>
                      <div className="text-2xl font-bold font-mono text-primary">
                        {sections.reduce((acc, s) => {
                          const scored = s.indicators.filter(i => i.managerScore !== null);
                          if (scored.length === 0) return acc;
                          return acc + scored.reduce((sum, i) => sum + (i.managerScore || 0), 0) / scored.length * s.weight / 100;
                        }, 0).toFixed(2)}
                      </div>
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
              // Show editable form for draft/submitted
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
              <div className="flex items-center justify-between p-4 bg-card border rounded-xl">
                <div>
                  {validation.valid ? (
                    <p className="text-sm text-evidence-success font-medium flex items-center gap-2">
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
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saving ? "Saving..." : "Save Draft"}
                  </Button>
                  <Button 
                    onClick={handleSubmit}
                    disabled={!validation.valid || saving}
                    className={cn(
                      !validation.valid && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Assessment
                  </Button>
                </div>
              </div>
            )}
          </div>
          
          {/* Score Panel */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              {!isReviewed && <WeightedScoreDisplay sections={sections} />}
              
              {/* Legend for Review */}
              {isReviewed && (
                <Card>
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
                      <hr className="my-3" />
                      <p className="text-muted-foreground text-xs">
                        Compare your self-assessment with your manager's review. 
                        Green indicates higher scores, red indicates lower.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
