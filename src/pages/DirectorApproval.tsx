import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, Building, CheckCircle, XCircle, User, FileText, MessageSquare, Link as LinkIcon, Paperclip } from "lucide-react";
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
  manager_notes?: string;
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
  const [directorComments, setDirectorComments] = useState('');

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
        manager_notes: (a as any).manager_notes || '',
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
        director_comments: directorComments || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentAssessment.id);

    setProcessing(false);

    if (error) {
      console.error('Approve error:', error);
      toast({ title: "Error", description: "Failed to approve: " + error.message, variant: "destructive" });
    } else {
      toast({ title: "Approved", description: "Assessment has been approved" });
      navigate('/director');
    }
  };

  const handleReject = async () => {
    if (!currentAssessment) return;
    
    if (!directorComments.trim()) {
      toast({ title: "Required", description: "Please provide comments when rejecting", variant: "destructive" });
      return;
    }

    setProcessing(true);
    const { error } = await supabase
      .from('assessments')
      .update({
        status: 'rejected',
        director_id: user?.id,
        director_comments: directorComments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', currentAssessment.id);

    setProcessing(false);

    if (error) {
      console.error('Reject error:', error);
      toast({ title: "Error", description: "Failed to reject: " + error.message, variant: "destructive" });
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
                  const staffEvRaw = currentAssessment.staffEvidence[indicator.id];
                  const managerEvRaw = currentAssessment.managerEvidence[indicator.id];
                  
                  // Extract evidence details (can be string, object, or array)
                  const parseEvidence = (ev: any): { notes: string; links: string[] } => {
                    if (!ev) return { notes: '', links: [] };
                    
                    // If it's an array of evidence items
                    if (Array.isArray(ev)) {
                      const notes = ev.map(e => e.notes || e.evidence || '').filter(Boolean).join('\n');
                      const links = ev.flatMap(e => {
                        const text = e.evidence || '';
                        const urlRegex = /(https?:\/\/[^\s]+)/g;
                        return text.match(urlRegex) || [];
                      });
                      return { notes, links };
                    }
                    
                    // If it's an object with notes/evidence
                    if (typeof ev === 'object') {
                      const notes = ev.notes || ev.evidence || '';
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const links = (ev.evidence || '').match(urlRegex) || [];
                      return { notes, links };
                    }
                    
                    // If it's a string
                    if (typeof ev === 'string') {
                      const urlRegex = /(https?:\/\/[^\s]+)/g;
                      const links = ev.match(urlRegex) || [];
                      return { notes: ev, links };
                    }
                    
                    return { notes: '', links: [] };
                  };
                  
                  const staffEvidence = parseEvidence(staffEvRaw);
                  const managerEvidence = parseEvidence(managerEvRaw);
                  
                  // Get score label from score_options
                  const getScoreLabel = (score: number | null | undefined, options: ScoreOption[] | undefined): string => {
                    if (score === null || score === undefined || !options) return '';
                    const option = options.find(o => o.score === score);
                    return option?.label || '';
                  };
                  
                  const staffScoreLabel = getScoreLabel(staffScore, indicator.score_options);
                  const managerScoreLabel = getScoreLabel(managerScore, indicator.score_options);
                  
                  return (
                    <div key={indicator.id} className={cn("border-b last:border-0 p-4", idx % 2 === 0 && "bg-muted/20")}>
                      <h4 className="font-medium mb-1">{indicator.name}</h4>
                      {indicator.description && (
                        <p className="text-sm text-muted-foreground mb-2">{indicator.description}</p>
                      )}
                      
                      {/* Accepted Evidence Types */}
                      {indicator.evidence_guidance && (
                        <div className="mb-3 p-2 bg-muted/50 rounded text-xs">
                          <span className="font-medium">Accepted Evidence: </span>
                          <span className="text-muted-foreground">{indicator.evidence_guidance}</span>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 gap-6">
                        {/* Staff */}
                        <div className="space-y-2">
                          <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Staff Self-Assessment</p>
                          <div className="flex items-center gap-2">
                            <Badge variant={staffScore <= 1 ? 'destructive' : staffScore >= 3 ? 'default' : 'secondary'}>
                              {staffScore ?? '--'}/4
                            </Badge>
                            {staffScoreLabel && (
                              <span className="text-sm font-medium">{staffScoreLabel}</span>
                            )}
                          </div>
                          
                          {/* Staff Evidence */}
                          {(staffEvidence.notes || staffEvidence.links.length > 0) && (
                            <div className="mt-2 p-2 bg-muted/30 rounded text-sm space-y-2">
                              <p className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                                <Paperclip className="h-3 w-3" /> Evidence Provided:
                              </p>
                              {staffEvidence.notes && (
                                <p className="text-muted-foreground whitespace-pre-wrap">{staffEvidence.notes}</p>
                              )}
                              {staffEvidence.links.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {staffEvidence.links.map((link, i) => (
                                    <a 
                                      key={i}
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                      <LinkIcon className="h-3 w-3" />
                                      {link.length > 40 ? link.substring(0, 40) + '...' : link}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        
                        {/* Manager */}
                        <div className="border-l pl-6 space-y-2">
                          <p className="text-xs font-medium text-primary uppercase tracking-wide">Manager Review</p>
                          <div className="flex items-center gap-2">
                            <Badge className="bg-primary" variant="default">
                              {managerScore ?? '--'}/4
                            </Badge>
                            {managerScoreLabel && (
                              <span className="text-sm font-medium text-primary">{managerScoreLabel}</span>
                            )}
                          </div>
                          
                          {/* Manager Comments */}
                          {(managerEvidence.notes || managerEvidence.links.length > 0) && (
                            <div className="mt-2 p-2 bg-primary/5 rounded text-sm space-y-2">
                              <p className="text-xs font-medium text-primary flex items-center gap-1">
                                <MessageSquare className="h-3 w-3" /> Manager Comments:
                              </p>
                              {managerEvidence.notes && (
                                <p className="text-muted-foreground whitespace-pre-wrap">{managerEvidence.notes}</p>
                              )}
                              {managerEvidence.links.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                  {managerEvidence.links.map((link, i) => (
                                    <a 
                                      key={i}
                                      href={link}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                                    >
                                      <LinkIcon className="h-3 w-3" />
                                      {link.length > 40 ? link.substring(0, 40) + '...' : link}
                                    </a>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Score Summary */}
        <Card className="mt-8">
          <CardHeader className="bg-muted/30">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Score Summary
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="space-y-6">
              {currentAssessment.sections.map(section => {
                const sectionIndicators = section.indicators.map(ind => ({
                  name: ind.name,
                  staffScore: currentAssessment.staffScores[ind.id],
                  managerScore: currentAssessment.managerScores[ind.id],
                }));
                
                const validManagerScores = sectionIndicators.filter(i => i.managerScore !== null && i.managerScore !== undefined);
                const sectionAvg = validManagerScores.length > 0
                  ? validManagerScores.reduce((sum, i) => sum + (i.managerScore ?? 0), 0) / validManagerScores.length
                  : null;
                
                return (
                  <div key={section.id} className="border rounded-lg overflow-hidden">
                    <div className="bg-secondary/50 px-4 py-2 flex items-center justify-between">
                      <span className="font-semibold">{section.name}</span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline">{section.weight}%</Badge>
                        {sectionAvg !== null && (
                          <Badge className={cn(
                            sectionAvg < 2 && "bg-destructive",
                            sectionAvg >= 2 && sectionAvg < 3 && "bg-muted-foreground",
                            sectionAvg >= 3 && "bg-primary"
                          )}>
                            Avg: {sectionAvg.toFixed(2)}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="divide-y">
                      {sectionIndicators.map((ind, idx) => (
                        <div key={idx} className="px-4 py-2 flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">{ind.name}</span>
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Staff:</span>
                              <Badge variant="secondary" className="font-mono">
                                {ind.staffScore ?? '--'}/4
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-xs text-muted-foreground">Manager:</span>
                              <Badge variant="default" className="font-mono bg-primary">
                                {ind.managerScore ?? '--'}/4
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
              
              {/* Total Score & Grade */}
              <div className="border-t pt-4 flex items-center justify-between">
                <span className="text-lg font-semibold">Final Score</span>
                <div className="flex items-center gap-4">
                  <span className="text-3xl font-mono font-bold text-primary">
                    {currentAssessment.final_score?.toFixed(2) || '--'}
                  </span>
                  {currentAssessment.final_grade && (
                    <Badge className="text-lg px-4 py-1">{currentAssessment.final_grade}</Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manager Overall Notes */}
        {currentAssessment.manager_notes && (
          <Card className="mt-8 border-primary/20">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2 text-primary">
                <FileText className="h-5 w-5" />
                Manager Overall Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-muted-foreground whitespace-pre-wrap">{currentAssessment.manager_notes}</p>
            </CardContent>
          </Card>
        )}

        {/* Director Comments and Actions */}
        {canApprove && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Director Comments
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Add your comments here (required for rejection)..."
                value={directorComments}
                onChange={(e) => setDirectorComments(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <div className="flex justify-end gap-3">
                <Button variant="destructive" onClick={handleReject} disabled={processing}>
                  <XCircle className="h-4 w-4 mr-2" />
                  {processing ? "Processing..." : "Reject"}
                </Button>
                <Button onClick={handleApprove} disabled={processing}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {processing ? "Processing..." : "Approve"}
                </Button>
              </div>
            </CardContent>
          </Card>
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
