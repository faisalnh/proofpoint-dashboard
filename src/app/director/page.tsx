'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import {
    AssessmentProgress,
    ReviewComparisonSection,
    WeightedScoreDisplay
} from '@/components/assessment';
import { ScoreComparisonWidget } from '@/components/assessment/ScoreComparisonWidget';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    useAssessment,
    calculateWeightedScore,
    DomainData,
    StandardData,
    KPIData
} from '@/hooks/useAssessment';
import {
    Building2,
    ChevronRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Search,
    ShieldCheck,
    Trash2,
    Save,
    Send,
    Layout,
    FileText,
    Info,
    AlertCircle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';
import {
    Alert,
    AlertTitle,
    AlertDescription
} from '@/components/ui/alert';

interface WorkflowStep {
    id: string;
    department_role_id: string;
    step_order: number;
    approver_role: string;
    step_type: string;
}

function DirectorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assessmentId = searchParams.get('id');
    const { user, isAdmin } = useAuth();

    const [assessments, setAssessments] = useState<any[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const [workflowSteps, setWorkflowSteps] = useState<WorkflowStep[]>([]);
    const [workflowLoading, setWorkflowLoading] = useState(false);

    const {
        assessment,
        domains,
        loading: assessmentLoading,
        saving,
        saveDraft,
        approveAssessment,
        updateKPI,
        managerFeedback,
        directorFeedback,
        setDirectorFeedback,
        deleteAssessment
    } = useAssessment(assessmentId || undefined);
    const [searchTerm, setSearchTerm] = useState('');
    const [showStickyBar, setShowStickyBar] = useState(false);

    // Scroll detection to show sticky bar after scrolling past header
    useEffect(() => {
        if (!assessmentId) return;

        const handleScroll = () => {
            setShowStickyBar(window.scrollY > 300);
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial position
        return () => window.removeEventListener('scroll', handleScroll);
    }, [assessmentId]);

    // Fetch organizational assessments (those pending director approval)
    useEffect(() => {
        if (!user) return;

        const fetchOrgAssessments = async () => {
            setLoadingList(true);
            const { data, error } = await api.getAssessments();

            if (!error && data) {
                setAssessments((data as any[]));
            }
            setLoadingList(false);
        };

        fetchOrgAssessments();
    }, [user]);

    // Fetch workflow steps when assessment is loaded to determine flow type
    useEffect(() => {
        if (!assessment) return;

        const fetchWorkflow = async () => {
            setWorkflowLoading(true);
            console.log('[Director] Starting workflow detection for assessment:', assessment.id);
            console.log('[Director] Assessment staff_id:', assessment.staff_id);
            console.log('[Director] Assessment staff_department_id:', (assessment as any).staff_department_id);

            try {
                // Step 1: Get the staff's roles (e.g., manager, staff, etc.)
                const { data: staffRoles, error: rolesError } = await api.getUserRoles(assessment.staff_id);
                console.log('[Director] Staff roles API response:', { staffRoles, rolesError });

                if (!staffRoles || (staffRoles as any[]).length === 0) {
                    console.log('[Director] No staff roles found, exiting');
                    setWorkflowLoading(false);
                    return;
                }

                // Step 2: Get all department roles to find the one matching staff's department + role
                const { data: deptRoles, error: deptRolesError } = await api.getDepartmentRoles();
                console.log('[Director] Department roles API response:', { deptRoles, deptRolesError });

                if (!deptRoles) {
                    console.log('[Director] No department roles found, exiting');
                    setWorkflowLoading(false);
                    return;
                }

                // Cast to proper types
                const staffRolesList = (staffRoles as { role: string }[]).map(r => r.role);
                const departmentRoles = deptRoles as { id: string; department_id: string; role: string }[];
                console.log('[Director] Staff roles list:', staffRolesList);
                console.log('[Director] Department roles:', departmentRoles);

                // Find the department_role that matches staff's department_id and one of their roles
                // The assessment has staff_department_id from the API
                const staffDeptId = (assessment as any).staff_department_id;
                console.log('[Director] Looking for department_role with department_id:', staffDeptId, 'and roles:', staffRolesList);

                const matchingDeptRole = departmentRoles.find(dr =>
                    dr.department_id === staffDeptId && staffRolesList.includes(dr.role)
                );
                console.log('[Director] Matching department_role:', matchingDeptRole);

                if (!matchingDeptRole) {
                    console.log('[Director] No matching department_role found for staff');
                    setWorkflowLoading(false);
                    return;
                }

                // Step 3: Get workflow for this specific department_role (using public endpoint)
                const { data: workflows, error: workflowsError } = await api.getWorkflows(matchingDeptRole.id);
                console.log('[Director] Workflows API response:', { workflows, workflowsError });

                if (workflows) {
                    // Filter to only director steps
                    const directorSteps = (workflows as WorkflowStep[]).filter(
                        step => step.approver_role === 'director'
                    );
                    console.log('[Director] Director steps found:', directorSteps);
                    console.log('[Director] Is review_and_approval:', directorSteps.some(s => s.step_type === 'review_and_approval'));
                    setWorkflowSteps(directorSteps);
                }
            } catch (err) {
                console.error('[Director] Failed to fetch workflow:', err);
            }
            setWorkflowLoading(false);
        };

        fetchWorkflow();
    }, [assessment]);

    // Determine if director step is "review_and_approval" (meaning director does both review and approval)
    const isDirectorReviewAndApproval = workflowSteps.some(
        step => step.approver_role === 'director' && step.step_type === 'review_and_approval'
    );

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'self_submitted':
                // If director does review_and_approval, show as pending director review
                if (isDirectorReviewAndApproval) {
                    return <Badge className="bg-purple-100 text-purple-700 border-purple-200">Pending Director Review</Badge>;
                }
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Submitted</Badge>;
            case 'manager_reviewed':
                return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending Director Approval</Badge>;
            case 'director_approved':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
            case 'acknowledged':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Finalized</Badge>;
            default:
                return <Badge variant="outline">{status.replace('_', ' ')}</Badge>;
        }
    };

    const filteredAssessments = assessments.filter(a =>
        a.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.period.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Detail View
    if (assessmentId) {
        if (assessmentLoading || workflowLoading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading assessment details...</p>
                </div>
            );
        }

        const staffScore = calculateWeightedScore(domains, 'staff');
        const managerScore = calculateWeightedScore(domains, 'manager');
        const isApproved = assessment?.status === 'director_approved' || assessment?.status === 'acknowledged';

        // Director can edit in two scenarios:
        // 1. status is 'manager_reviewed' (manager already reviewed, director just approves) - approval only
        // 2. status is 'self_submitted' AND workflow is 'review_and_approval' (director does both review and approval)
        const isPendingDirectorReview = assessment?.status === 'manager_reviewed';
        const isDirectorReviewMode = assessment?.status === 'self_submitted' && isDirectorReviewAndApproval;
        const canEdit = isPendingDirectorReview || isDirectorReviewMode;
        const isReadOnly = !canEdit;

        // Determine the label for the reviewer column
        const reviewerLabel = isDirectorReviewAndApproval ? "Director Review" : "Manager Review";

        return (
            <div className="max-w-7xl mx-auto py-8">
                {/* Status Alert Bar */}
                {isApproved && (
                    <Alert className="mb-8 border-2 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500 bg-emerald-50 border-emerald-500/30">
                        <ShieldCheck className="h-5 w-5 text-emerald-600" />
                        <AlertTitle className="font-bold text-lg mb-1">
                            {assessment?.status === 'acknowledged' ? "Cycle Complete" : "Director Approved"}
                        </AlertTitle>
                        <AlertDescription className="text-base">
                            {assessment?.status === 'acknowledged'
                                ? "This assessment cycle is complete. Final results have been archived."
                                : "This assessment has been approved by the director and is awaiting staff acknowledgement."}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Header Actions */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                    <div className="flex items-center gap-6">
                        <Button variant="outline" size="icon" onClick={() => router.push('/director')} className="h-12 w-12 rounded-xl shadow-sm hover:bg-muted/50 border-muted-foreground/20">
                            <ArrowLeft className="h-6 w-6" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <h1 className="text-4xl font-black tracking-tight">Director Review</h1>
                                {isReadOnly && <Badge variant="secondary" className="bg-muted-foreground/10 text-muted-foreground font-mono">READ ONLY</Badge>}
                            </div>
                            <p className="text-muted-foreground text-lg">{assessment?.staff_name} • {assessment?.period}</p>
                        </div>
                    </div>

                    {!isReadOnly && (
                        <div className="flex items-center gap-4">
                            <Button variant="outline" onClick={saveDraft} disabled={saving} className="h-12 px-6 rounded-xl border-primary/20 hover:bg-primary/5 transition-all">
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Draft
                            </Button>
                            <Button
                                className="h-12 px-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 glow-primary transition-all duration-300"
                                onClick={approveAssessment}
                                disabled={saving || !directorFeedback.trim()}
                            >
                                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                {isDirectorReviewMode ? "Submit Director Review & Approve" : "Approve Assessment"}
                            </Button>
                        </div>
                    )}

                    {isReadOnly && isAdmin && (
                        <div className="flex items-center gap-4">
                            <Button
                                variant="destructive"
                                onClick={async () => {
                                    if (window.confirm("Are you sure you want to delete this assessment? This action cannot be undone.")) {
                                        if (await deleteAssessment()) {
                                            router.push('/director');
                                        }
                                    }
                                }}
                                disabled={saving}
                                className="h-12 px-6 rounded-xl shadow-lg hover:shadow-destructive/20 transition-all font-bold"
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete Assessment
                            </Button>
                        </div>
                    )}
                </div>

                {/* Cycle Progress Panel */}
                <div className="mb-10">
                    <Card className="glass-panel border-border/30 shadow-lg overflow-hidden">
                        <CardHeader className="pb-4">
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Layout className="h-5 w-5 text-primary" />
                                Cycle Progress
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pb-8">
                            <AssessmentProgress status={assessment?.status || 'self_submitted'} />
                        </CardContent>
                    </Card>
                </div>

                {/* Main Content Grid - 12 column layout like self-assessment */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Main Content: Domains - 8 columns */}
                    <div className="lg:col-span-8 space-y-10">
                        {domains.map((domain: DomainData, index: number) => (
                            <ReviewComparisonSection
                                key={domain.id}
                                index={index}
                                onIndicatorChange={isReadOnly ? undefined : updateKPI}
                                readonly={isReadOnly}
                                reviewerLabel={isDirectorReviewAndApproval ? "Director" : "Manager"}
                                section={{
                                    ...domain,
                                    standards: domain.standards.map((s: StandardData) => ({
                                        ...s,
                                        kpis: s.kpis.map((i: KPIData) => ({
                                            ...i,
                                            description: i.description || '',
                                            staffScore: i.score,
                                            staffEvidence: i.evidence,
                                            managerScore: i.managerScore ?? null,
                                            managerEvidence: i.managerEvidence ?? ''
                                        }))
                                    }))
                                }}
                            />
                        ))}

                        {/* Final Director Feedback Section - at bottom of form column */}
                        <Card className="glass-panel border-border/30 overflow-hidden shadow-2xl">
                            <CardHeader className="bg-emerald-500/5 border-b border-border/10 pb-6 pt-8 px-8">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    <CardTitle className="text-2xl font-black">Final Director Feedback</CardTitle>
                                </div>
                                <CardDescription className="text-base mt-2">
                                    Provide your final assessment summary and organizational feedback.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="pt-8 px-8 pb-10">
                                {isReadOnly ? (
                                    <div className="space-y-6">
                                        <div className="relative">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500/20 rounded-full" />
                                            <div className="pl-6 py-2">
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Director's Final Comments</span>
                                                <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                                                    {directorFeedback || <span className="text-muted-foreground italic">No feedback provided</span>}
                                                </p>
                                            </div>
                                        </div>
                                        {isApproved && (
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-700">
                                                <ShieldCheck className="h-6 w-6" />
                                                <div className="text-sm font-bold">
                                                    Director Approved & Signed
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {/* Manager Feedback Reference - only show if there's manager feedback */}
                                        {managerFeedback && (
                                            <div className="bg-muted/30 border border-border/50 rounded-xl p-5">
                                                <div className="flex items-center gap-2 mb-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                                                    <Info className="h-3.5 w-3.5" />
                                                    Manager's Rationale (Reference)
                                                </div>
                                                <p className="text-sm text-foreground/80 whitespace-pre-wrap">
                                                    {managerFeedback}
                                                </p>
                                            </div>
                                        )}

                                        <div className="space-y-4">
                                            <Label htmlFor="director-feedback" className="text-base font-bold flex items-center gap-2">
                                                Director Final Feedback <span className="text-destructive">*</span>
                                            </Label>
                                            <Textarea
                                                id="director-feedback"
                                                placeholder="Provide final oversight comments, organizational context, and any additional recommendations..."
                                                className="min-h-[200px] bg-background border-emerald-500/20 focus-visible:ring-emerald-500/40 text-base leading-relaxed p-4 shadow-inner"
                                                value={directorFeedback}
                                                onChange={(e) => setDirectorFeedback(e.target.value)}
                                            />
                                            {!directorFeedback.trim() && (
                                                <div className="flex items-center gap-2 text-xs text-destructive font-medium">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Feedback is required to approve this assessment
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar: Progress & Score - 4 columns */}
                    <div className="lg:col-span-4 space-y-8">
                        <div className="sticky top-24 space-y-8">
                            {/* Score Comparison Widget */}
                            <ScoreComparisonWidget
                                domains={domains}
                                finalScore={managerScore}
                                projectedScore={staffScore}
                            />

                            <Card className="bg-muted/30 border-dashed border-2 border-muted-foreground/10">
                                <CardContent className="pt-6 pb-6 px-6">
                                    <div className="flex gap-4 items-start">
                                        <Info className="h-5 w-5 text-muted-foreground/60 shrink-0 mt-0.5" />
                                        <p className="text-xs text-muted-foreground leading-relaxed italic">
                                            The Grade is calculated based on domain weights defined in the organizational playbook.
                                            KPIs marked as <strong>'X'</strong> are excluded from the performance calculation for this period.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Alert className="bg-emerald-500/5 border-emerald-500/10">
                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                <AlertTitle className="text-sm font-semibold">
                                    {isDirectorReviewAndApproval ? "Director Review & Approval" : "Director Approval"}
                                </AlertTitle>
                                <AlertDescription className="text-xs">
                                    {isDirectorReviewAndApproval
                                        ? "As the direct approver, review and score each KPI, then provide your final feedback to complete the assessment."
                                        : "Review the manager's assessment and provide final approval to complete the evaluation cycle."}
                                </AlertDescription>
                            </Alert>
                        </div>
                    </div>
                </div>
                {/* Sticky Action Bar at Bottom */}
                {!isReadOnly && showStickyBar && (
                    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-lg border-t border-border/50 py-4 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
                        <div className="container px-4 flex items-center justify-between">
                            <div className="hidden md:flex flex-col">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Currently Reviewing</span>
                                <span className="text-sm font-bold truncate max-w-[200px]">{assessment?.staff_name}</span>
                            </div>
                            <div className="flex items-center gap-4 w-full md:w-auto">
                                <Button
                                    variant="outline"
                                    onClick={saveDraft}
                                    disabled={saving}
                                    className="flex-1 md:flex-none h-12 px-6 rounded-xl border-primary/20 hover:bg-primary/5 transition-all"
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                    Save Draft
                                </Button>
                                <Button
                                    className="flex-[2] md:flex-none h-12 px-8 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 glow-primary transition-all duration-300"
                                    onClick={approveAssessment}
                                    disabled={saving || !directorFeedback.trim()}
                                >
                                    {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <ShieldCheck className="h-4 w-4 mr-2" />}
                                    {isDirectorReviewMode ? "Submit Director Review & Approve" : "Approve Assessment"}
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Dashboard List View
    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2 text-gradient-hero">Organization Oversight</h1>
                    <p className="text-muted-foreground">Executive dashboard for organizational performance approval and monitoring.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search organization..."
                        className="pl-10 glass-panel"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <Card className="glass-panel border-border/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-emerald-500/30 via-emerald-500 to-emerald-500/30" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Building2 className="h-5 w-5 text-emerald-500" />
                        Organizational Assessments
                    </CardTitle>
                    <CardDescription>Comprehensive view of all departmental performance evaluations</CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingList ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Analyzing organizational data...</p>
                        </div>
                    ) : filteredAssessments.length === 0 ? (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                            <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                            <h3 className="text-lg font-semibold">No data available</h3>
                            <p className="text-muted-foreground">No assessments are currently under review.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAssessments.map((a) => (
                                <div
                                    key={a.id}
                                    onClick={() => router.push(`/director?id=${a.id}`)}
                                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <ShieldCheck className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground group-hover:text-emerald-600 transition-colors">{a.staff_name}</h4>
                                            <p className="text-sm text-muted-foreground">{a.period} • {new Date(a.created_at).toLocaleDateString()}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                                        <div className="text-right">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                                            <div className="mt-1">{getStatusBadge(a.status)}</div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function DirectorPage() {
    return (
        <ProtectedRoute requiredRoles={['director', 'admin']}>
            <div className="min-h-screen bg-background relative">
                <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
                <Header />
                <main className="container relative px-4 py-8">
                    <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin fixed top-1/2 left-1/2" />}>
                        <DirectorContent />
                    </Suspense>
                </main>
            </div>
        </ProtectedRoute>
    );
}
