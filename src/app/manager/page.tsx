'use client';

import { toast } from '@/hooks/use-toast';

import { useState, Suspense, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import {
    ReviewComparisonSection,
    WeightedScoreDisplay
} from '@/components/assessment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { AssessmentPrintView } from '@/components/assessment/AssessmentPrintView';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    useAssessment,
    useTeamAssessments,
    calculateWeightedScore,
    DomainData,
    StandardData,
    KPIData
} from '@/hooks/useAssessment';
import {
    Users,
    ChevronRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Clock,
    AlertCircle,
    Search,
    FileText,
    Trash2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth';

function ManagerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assessmentId = searchParams.get('id');
    const isPrintMode = searchParams.get('print') === 'true';


    const { assessments, loading: listLoading } = useTeamAssessments();
    const {
        assessment,
        domains,
        loading: assessmentLoading,
        updateIndicator,
        saveDraft,
        submitReview,
        saving,
        managerFeedback,
        setManagerFeedback,
        deleteAssessment
    } = useAssessment(assessmentId || undefined);

    const { isAdmin } = useAuth();

    useEffect(() => {
        if (isPrintMode && !assessmentLoading && assessment) {
            setTimeout(() => {
                window.print();
            }, 500);
        }
    }, [isPrintMode, assessmentLoading, assessment]);

    const currentStaffName = assessments.find(a => a.id === assessmentId)?.staff_name;

    const [searchTerm, setSearchTerm] = useState('');

    if (isPrintMode && assessment && sections) {
        return (
            <AssessmentPrintView
                assessment={assessment}
                sections={sections}
                staffName={currentStaffName}
            />
        );
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'draft':
                return <Badge variant="outline" className="text-muted-foreground">Draft</Badge>;
            case 'self_submitted':
                return <Badge className="bg-amber-100 text-amber-700 border-amber-200">Pending Review</Badge>;
            case 'manager_reviewed':
                return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Reviewed</Badge>;
            case 'director_approved':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    const filteredAssessments = assessments.filter(a =>
        a.staff_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.staff_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        a.period.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Check loading for detailed view
    if (assessmentId && !assessment && !assessmentLoading) {
        return <div>Assessment not found</div>;
    }

    // Filter assessments
    const activeAssessments = filteredAssessments.filter(a => a.status !== 'acknowledged');
    const completedAssessments = filteredAssessments.filter(a => a.status === 'acknowledged');

    const handleDownloadPDF = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();

        toast({
            title: "Opening Report",
            description: "Opening print view for assessment report...",
        });

        // Open the assessment detail in a new window with print=true param
        const url = `/manager?id=${id}&print=true`;
        window.open(url, '_blank');
    };

    const staffWeightedScore = calculateWeightedScore(domains, 'staff');
    const managerWeightedScore = calculateWeightedScore(domains, 'manager');
    const isReadOnly = assessment?.status === 'manager_reviewed' ||
        assessment?.status === 'director_approved' ||
        assessment?.status === 'acknowledged';

    const content = assessmentId ? (
        // Detailed Assessment View
        <div className="max-w-5xl mx-auto py-8">
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/manager')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <Badge variant="secondary" className="font-mono">{assessment?.period}</Badge>
                            {getStatusBadge(assessment?.status || '')}
                        </div>
                        <h1 className="text-3xl font-bold tracking-tight">Review: {assessment?.staff_name || 'Staff Assessment'}</h1>
                        <p className="text-muted-foreground">{assessment?.staff_email}</p>
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            onClick={saveDraft}
                            disabled={saving}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Save Draft
                        </Button>
                        <Button
                            className="glow-primary"
                            onClick={submitReview}
                            disabled={saving || !managerFeedback.trim()}
                        >
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Submit Review
                        </Button>
                    </div>
                )}

                {isAdmin && (
                    <Button
                        variant="destructive"
                        size="icon"
                        className="h-10 w-10 rounded-xl shadow-lg hover:shadow-destructive/20 ml-2"
                        onClick={async () => {
                            if (window.confirm("Are you sure you want to delete this assessment? This action cannot be undone.")) {
                                if (await deleteAssessment()) {
                                    router.push('/manager');
                                }
                            }
                        }}
                    >
                        <Trash2 className="h-4 w-4" />
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {domains.map((domain: DomainData) => (
                        <ReviewComparisonSection
                            key={domain.id}
                            onIndicatorChange={updateIndicator}
                            readonly={isReadOnly}
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

                    {/* Overall Feedback Section */}
                    <Card className="glass-panel border-border/30 overflow-hidden mt-8">
                        <CardHeader className="bg-primary/[0.03] border-b border-border/10">
                            <CardTitle className="text-lg flex items-center gap-2">
                                <FileText className="h-5 w-5 text-primary" />
                                Overall Manager Feedback
                            </CardTitle>
                            <CardDescription>Provide a summary rationale for the final grade and general comments on performance.</CardDescription>
                        </CardHeader>
                        <CardContent className="pt-6">
                            {isReadOnly ? (
                                <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-foreground whitespace-pre-wrap">
                                    {managerFeedback || <span className="text-muted-foreground italic">No overall feedback provided</span>}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="overall-feedback" className="text-sm font-semibold">Summary Comments <span className="text-evidence-alert">*</span></Label>
                                        <span className="text-xs text-muted-foreground">This feedback is required for submission</span>
                                    </div>
                                    <Textarea
                                        id="overall-feedback"
                                        placeholder="Summarize the performance review, highlight strengths, and note areas for development..."
                                        className="min-h-[200px] bg-background border-primary/20 focus-visible:ring-primary/30 text-base"
                                        value={managerFeedback}
                                        onChange={(e) => setManagerFeedback(e.target.value)}
                                    />
                                    {!managerFeedback.trim() && (
                                        <div className="flex items-center gap-2 text-xs text-evidence-alert mt-1">
                                            <AlertCircle className="h-3 w-3" />
                                            Please provide overall feedback before submitting
                                        </div>
                                    )}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <div className="sticky top-24 space-y-6">
                        <Card className="glass-panel border-border/30">
                            <CardHeader>
                                <CardTitle className="text-lg">Staff Summary</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Self-Rating Score</span>
                                    <div className="text-3xl font-mono font-bold text-foreground mt-1">
                                        {staffWeightedScore?.toFixed(2) || '-.--'}
                                    </div>
                                </div>
                                <div>
                                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Status</span>
                                    <div className="mt-1">{getStatusBadge(assessment?.status || '')}</div>
                                </div>
                            </CardContent>
                        </Card>

                        <WeightedScoreDisplay
                            domains={domains}
                            score={staffWeightedScore}
                            label="Staff Self-Grade"
                            type="staff"
                        />
                        <WeightedScoreDisplay
                            domains={domains}
                            score={managerWeightedScore}
                            label="Manager Review Grade"
                            type="manager"
                        />

                        <Alert className="bg-primary/5 border-primary/10">
                            <AlertCircle className="h-4 w-4 text-primary" />
                            <AlertTitle className="text-sm font-semibold">Quick Tip</AlertTitle>
                            <AlertDescription className="text-xs">
                                Compare the staff's self-assessment with their evidence. You can provide your own scores and feedback for each indicator.
                            </AlertDescription>
                        </Alert>
                    </div>
                </div>
            </div>
        </div>
    ) : (
        // Dashboard List View (No ID)
        <div className="max-w-6xl mx-auto py-8 space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Team Assessments</h1>
                    <p className="text-muted-foreground">Manage and review performance evaluations for your team.</p>
                </div>

                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search staff or period..."
                        className="pl-10 glass-panel"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            {/* Active Reviews Section */}
            <Card className="glass-panel border-border/30 overflow-hidden">
                <div className="h-1 bg-gradient-to-r from-violet-500/30 via-violet-500 to-violet-500/30" />
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5 text-violet-500" />
                        Active Reviews
                    </CardTitle>
                    <CardDescription>Assessments waiting for your review or currently in progress</CardDescription>
                </CardHeader>
                <CardContent>
                    {listLoading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Fetching team data...</p>
                        </div>
                    ) : activeAssessments.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                <CheckCircle2 className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-semibold mb-1">All caught up!</h3>
                            <p className="text-sm text-muted-foreground">No active reviews pending.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {activeAssessments.map((a) => (
                                <div
                                    key={a.id}
                                    onClick={() => router.push(`/manager?id=${a.id}`)}
                                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30 hover:border-violet-500/50 hover:bg-violet-500/[0.02] transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-violet-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <FileText className="h-6 w-6 text-violet-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground group-hover:text-violet-600 transition-colors">{a.staff_name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>{a.period}</span>
                                                <span>•</span>
                                                <span>{new Date(a.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 mt-4 md:mt-0">
                                        <div className="hidden md:block text-right">
                                            <p className="text-xs text-muted-foreground uppercase font-semibold">Status</p>
                                            <div className="mt-1">{getStatusBadge(a.status)}</div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-violet-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Completed History Section */}
            <Card className="glass-panel border-border/30 overflow-hidden">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                        Completed History
                    </CardTitle>
                    <CardDescription>Finalized and acknowledged performance appraisals</CardDescription>
                </CardHeader>
                <CardContent>
                    {listLoading ? (
                        <div className="flex flex-col items-center justify-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : completedAssessments.length === 0 ? (
                        <div className="text-center py-12 bg-muted/20 rounded-xl border border-dashed">
                            <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
                                <Clock className="h-6 w-6 text-muted-foreground" />
                            </div>
                            <h3 className="text-base font-semibold mb-1">No history yet</h3>
                            <p className="text-sm text-muted-foreground">Completed assessments will appear here.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {completedAssessments.map((a) => (
                                <div
                                    key={a.id}
                                    onClick={() => router.push(`/manager?id=${a.id}`)}
                                    className="group flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl bg-background/50 border border-border/30 hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all cursor-pointer"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-foreground group-hover:text-emerald-600 transition-colors">{a.staff_name}</h4>
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                <span>{a.period}</span>
                                                <span>•</span>
                                                <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                                                    Finalized
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-4 mt-4 md:mt-0">
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            className="h-9 gap-2"
                                            onClick={(e) => handleDownloadPDF(e, a.id)}
                                        >
                                            <FileText className="h-4 w-4" />
                                            Download Report
                                        </Button>
                                        <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );

    // Check loading for detailed view
    if (assessmentId && !assessment && !assessmentLoading) {
        return <div>Assessment not found</div>;
    }

    return (
        <div className="min-h-screen bg-background relative">
            <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
            <Header />
            <main className="container relative px-4 py-8">
                {content}
            </main>
        </div>
    );
}

export default function ManagerPage() {
    return (
        <ProtectedRoute requiredRoles={['manager', 'admin']}>
            <Suspense fallback={
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            }>
                <ManagerContent />
            </Suspense>
        </ProtectedRoute>
    );
}

// Simple Alert components if not available
function Alert({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`p-4 rounded-lg flex gap-3 ${className}`}>{children}</div>;
}
function AlertTitle({ children, className }: { children: React.ReactNode, className?: string }) {
    return <h5 className={`font-medium mb-1 ${className}`}>{children}</h5>;
}
function AlertDescription({ children, className }: { children: React.ReactNode, className?: string }) {
    return <div className={`text-sm ${className}`}>{children}</div>;
}
