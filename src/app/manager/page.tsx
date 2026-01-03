'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import {
    ReviewComparisonSection,
    WeightedScoreDisplay
} from '@/components/assessment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    useAssessment,
    useTeamAssessments,
    calculateWeightedScore
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
    FileText
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

function ManagerContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assessmentId = searchParams.get('id');

    const { assessments, loading: listLoading } = useTeamAssessments();
    const {
        assessment,
        sections,
        loading: assessmentLoading,
        updateIndicator,
        saveDraft,
        submitReview,
        saving,
        managerFeedback,
        setManagerFeedback
    } = useAssessment(assessmentId || undefined);

    const [searchTerm, setSearchTerm] = useState('');

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

    // Detail View (If ID is present)
    if (assessmentId) {
        if (assessmentLoading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading assessment for review...</p>
                </div>
            );
        }

        const staffWeightedScore = calculateWeightedScore(sections, 'staff');
        const managerWeightedScore = calculateWeightedScore(sections, 'manager');
        const isReadOnly = assessment?.status === 'manager_reviewed' || assessment?.status === 'director_approved';

        return (
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
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {sections.map((section) => (
                            <ReviewComparisonSection
                                key={section.id}
                                onIndicatorChange={updateIndicator}
                                readonly={isReadOnly}
                                section={{
                                    ...section,
                                    indicators: section.indicators.map(i => ({
                                        ...i,
                                        staffScore: i.score,
                                        staffEvidence: i.evidence,
                                        managerScore: i.managerScore ?? null,
                                        managerEvidence: i.managerEvidence ?? ''
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
                                score={staffWeightedScore}
                                label="Staff Self-Grade"
                            />
                            <WeightedScoreDisplay
                                score={managerWeightedScore}
                                label="Manager Review Grade"
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
        );
    }

    // Dashboard List View (No ID)
    return (
        <div className="max-w-6xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
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
                    ) : filteredAssessments.length === 0 ? (
                        <div className="text-center py-20 bg-muted/20 rounded-xl border border-dashed">
                            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                                <Users className="h-8 w-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-semibold mb-1">No assessments found</h3>
                            <p className="text-muted-foreground">Try adjusting your search or check back later.</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {filteredAssessments.map((a) => (
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
        </div>
    );
}

export default function ManagerPage() {
    return (
        <ProtectedRoute requiredRoles={['manager', 'admin']}>
            <div className="min-h-screen bg-background relative">
                <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
                <Header />
                <main className="container relative px-4 py-8">
                    <Suspense fallback={
                        <div className="flex flex-col items-center justify-center min-h-[60vh]">
                            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                            <p className="text-muted-foreground">Loading...</p>
                        </div>
                    }>
                        <ManagerContent />
                    </Suspense>
                </main>
            </div>
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
