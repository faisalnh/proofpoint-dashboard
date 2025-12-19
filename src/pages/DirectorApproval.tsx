import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Building, CheckCircle, XCircle, User, FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { calculateWeightedScore, getGradeFromScore, SectionData, ScoreOption } from "@/hooks/useAssessment";
import { supabase } from "@/integrations/supabase/client";
import { AssessmentProgress } from "@/components/assessment/AssessmentProgress";
import { getStatusLabel } from "@/lib/assessmentStatus";

interface AssessmentWithDetails {
  id: string;
  period: string;
  status: string;
  staff_id: string;
  staff_name?: string;
  staff_email?: string;
  manager_name?: string;
  final_score: number | null;
  final_grade: string | null;
  staff_submitted_at: string | null;
  manager_reviewed_at: string | null;
  sections: SectionData[];
  staffScores: Record<string, number>;
  staffEvidence: Record<string, string>;
  managerScores: Record<string, number>;
  managerEvidence: Record<string, string>;
}

export default function DirectorApproval() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const assessmentId = searchParams.get('id');
  const { user } = useAuth();
  
  const [assessments, setAssessments] = useState<AssessmentWithDetails[]>([]);
  const [currentAssessment, setCurrentAssessment] = useState<AssessmentWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    async function fetchAssessments() {
      // Fetch acknowledged assessments pending director approval
      const { data, error } = await supabase
        .from('assessments')
        .select('*')
        .in('status', ['acknowledged', 'manager_reviewed', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error:', error);
        setLoading(false);
        return;
      }

      // Get staff and manager profiles
      const staffIds = [...new Set((data || []).map(a => a.staff_id))];
      const managerIds = [...new Set((data || []).filter(a => a.manager_id).map(a => a.manager_id))];
      const allUserIds = [...new Set([...staffIds, ...managerIds])];

      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name, email')
        .in('user_id', allUserIds);

      const profileMap = new Map(profiles?.map(p => [p.user_id, p]));

      const enriched = (data || []).map(a => ({
        id: a.id,
        period: a.period,
        status: a.status,
        staff_id: a.staff_id,
        staff_name: profileMap.get(a.staff_id)?.full_name || 'Unknown',
        staff_email: profileMap.get(a.staff_id)?.email || '',
        manager_name: a.manager_id ? profileMap.get(a.manager_id)?.full_name : undefined,
        final_score: a.final_score,
        final_grade: a.final_grade,
        staff_submitted_at: a.staff_submitted_at,
        manager_reviewed_at: a.manager_reviewed_at,
        sections: [],
        staffScores: (a.staff_scores || {}) as Record<string, number>,
        staffEvidence: (a.staff_evidence || {}) as Record<string, string>,
        managerScores: (a.manager_scores || {}) as Record<string, number>,
        managerEvidence: (a.manager_evidence || {}) as Record<string, string>,
      }));

      setAssessments(enriched);
      setLoading(false);
    }

    fetchAssessments();
  }, []);

  useEffect(() => {
    if (!assessmentId) {
      setCurrentAssessment(null);
      return;
    }

    async function fetchDetails() {
      const assessment = assessments.find(a => a.id === assessmentId);
      if (!assessment) return;

      // Fetch template sections
      const { data: assessmentData } = await supabase
        .from('assessments')
        .select('template_id')
        .eq('id', assessmentId)
        .single();

      if (!assessmentData?.template_id) {
        setCurrentAssessment(assessment);
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
        .eq('id', assessmentData.template_id)
        .single();

      if (templateData) {
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
                score: assessment.staffScores[i.id] ?? null,
                evidence: assessment.staffEvidence[i.id] || '',
              }))
          }));

        setCurrentAssessment({ ...assessment, sections });
      } else {
        setCurrentAssessment(assessment);
      }
    }

    fetchDetails();
  }, [assessmentId, assessments]);

  const handleApprove = async () => {
    if (!currentAssessment) return;

    setProcessing(true);
    const { error } = await supabase
      .from('assessments')
      .update({
        status: 'approved',
        director_id: user?.id,
        director_approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentAssessment.id);

    setProcessing(false);

    if (error) {
      toast({ title: "Error", description: "Failed to approve", variant: "destructive" });
    } else {
      toast({ title: "Approved", description: "Assessment has been approved" });
      navigate('/director');
    }
  };

  const handleReject = async () => {
    if (!currentAssessment) return;

    setProcessing(true);
    const { error } = await supabase
      .from('assessments')
      .update({
        status: 'rejected',
        director_id: user?.id,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentAssessment.id);

    setProcessing(false);

    if (error) {
      toast({ title: "Error", description: "Failed to reject", variant: "destructive" });
    } else {
      toast({ title: "Rejected", description: "Assessment has been sent back for revision" });
      navigate('/director');
    }
  };

  if (loading) {
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

  // List view
  if (!assessmentId) {
    const pendingApproval = assessments.filter(a => a.status === 'manager_reviewed');
    const reviewed = assessments.filter(a => a.status === 'approved' || a.status === 'rejected' || a.status === 'acknowledged');

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground tracking-tight flex items-center gap-3">
              <Building className="h-8 w-8" />
              Director Overview
            </h1>
            <p className="text-muted-foreground mt-1">Review and approve final assessments</p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Pending Approval ({pendingApproval.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pendingApproval.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No assessments pending approval</p>
                ) : (
                  <div className="space-y-2">
                    {pendingApproval.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/director?id=${a.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="h-5 w-5 text-primary" />
                          </div>
                          <div>
                            <div className="font-medium">{a.staff_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {a.period} • Reviewed by {a.manager_name || 'Manager'}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {a.final_score && (
                            <div className="text-right">
                              <p className="font-mono font-bold text-lg">{a.final_score.toFixed(2)}</p>
                              <Badge>{a.final_grade}</Badge>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completed ({reviewed.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {reviewed.length === 0 ? (
                  <p className="text-muted-foreground text-center py-4">No completed assessments</p>
                ) : (
                  <div className="space-y-2">
                    {reviewed.map(a => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 cursor-pointer transition-colors"
                        onClick={() => navigate(`/director?id=${a.id}`)}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                          <div>
                            <div className="font-medium">{a.staff_name}</div>
                            <div className="text-sm text-muted-foreground">{a.period}</div>
                          </div>
                        </div>
                        <Badge variant={a.status === 'approved' ? 'default' : 'destructive'}>
                          {getStatusLabel(a.status)}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  if (!currentAssessment) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container py-8">
          <p className="text-center text-muted-foreground">Assessment not found</p>
        </main>
      </div>
    );
  }

  const canApprove = currentAssessment.status === 'manager_reviewed';

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        <Button variant="ghost" onClick={() => navigate('/director')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>

        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">{currentAssessment.staff_name}</h1>
              <p className="text-muted-foreground mt-1">{currentAssessment.period} • Reviewed by {currentAssessment.manager_name}</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-mono font-bold text-primary">{currentAssessment.final_score?.toFixed(2) || '--'}</p>
              {currentAssessment.final_grade && (
                <Badge className="mt-2 text-lg px-4">{currentAssessment.final_grade}</Badge>
              )}
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <AssessmentProgress status={currentAssessment.status} />
          </CardContent>
        </Card>
        <div className="space-y-6">
          {currentAssessment.sections.map(section => (
            <Card key={section.id}>
              <CardHeader className="bg-secondary/30">
                <CardTitle className="flex items-center justify-between">
                  <span>{section.name}</span>
                  <Badge variant="outline">{section.weight}%</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {section.indicators.map((indicator, idx) => {
                  const staffScore = currentAssessment.staffScores[indicator.id];
                  const managerScore = currentAssessment.managerScores[indicator.id];
                  const staffEv = currentAssessment.staffEvidence[indicator.id];
                  const managerEv = currentAssessment.managerEvidence[indicator.id];
                  
                  return (
                    <div key={indicator.id} className={cn("border-b last:border-0 p-4", idx % 2 === 0 && "bg-muted/20")}>
                      <h4 className="font-medium mb-3">{indicator.name}</h4>
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Staff */}
                        <div>
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Staff Self-Assessment</p>
                          <Badge variant={staffScore <= 1 ? 'destructive' : staffScore >= 3 ? 'default' : 'secondary'}>
                            {staffScore ?? '--'}/4
                          </Badge>
                          {staffEv && <p className="text-sm mt-2 text-muted-foreground">{staffEv}</p>}
                        </div>
                        
                        {/* Manager */}
                        <div className="border-l pl-6">
                          <p className="text-xs font-medium text-primary uppercase tracking-wide mb-2">Manager Review</p>
                          <Badge className="bg-primary" variant="default">
                            {managerScore ?? '--'}/4
                          </Badge>
                          {managerEv && <p className="text-sm mt-2 text-muted-foreground">{managerEv}</p>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Actions */}
        {canApprove && (
          <div className="flex justify-end gap-3 mt-8 p-4 bg-card border rounded-xl">
            <Button variant="destructive" onClick={handleReject} disabled={processing}>
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Approve
            </Button>
          </div>
        )}

        {currentAssessment.status === 'approved' && (
          <div className="mt-8 p-4 bg-evidence-success-bg border border-evidence-success-border rounded-xl flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-evidence-success" />
            <p className="font-medium text-evidence-success">This assessment has been approved</p>
          </div>
        )}
      </main>
    </div>
  );
}
