'use client';

import { cn } from "@/lib/utils";

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import {
    AssessmentSection,
    AssessmentProgress,
    ReviewComparisonSection,
    WeightedScoreDisplay
} from '@/components/assessment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    useAssessment,
    useRubricTemplates,
    useMyAssessments,
    calculateWeightedScore
} from '@/hooks/useAssessment';
import {
    ClipboardList,
    Save,
    Send,
    ArrowLeft,
    Loader2,
    Calendar,
    Layout,
    AlertCircle,
    ShieldCheck,
    MessageSquare,
    Info
} from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

function AssessmentContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assessmentId = searchParams.get('id');

    const {
        assessment,
        sections,
        loading: assessmentLoading,
        saving,
        saveDraft,
        submitAssessment,
        updateIndicator,
        staffAcknowledgement,
        setStaffAcknowledgement,
        acknowledgeAssessment,
        managerFeedback,
        directorFeedback
    } = useAssessment(assessmentId || undefined);

    const { templates, loading: templatesLoading } = useRubricTemplates();
    const { createAssessment } = useMyAssessments();

    const [selectedTemplate, setSelectedTemplate] = useState<string>('');
    const [period, setPeriod] = useState<string>('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!selectedTemplate || !period) return;
        setIsCreating(true);
        const newAssessment = await createAssessment(selectedTemplate, period);
        if (newAssessment) {
            router.push(`/assessment?id=${newAssessment.id}`);
        }
        setIsCreating(false);
    };

    const weightedScore = calculateWeightedScore(sections, 'staff');
    const finalWeightedScore = calculateWeightedScore(sections, 'manager');

    // Loading State
    if (assessmentId && assessmentLoading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading assessment...</p>
            </div>
        );
    }

    // Selection View (No ID)
    if (!assessmentId) {
        return (
            <div className="max-w-2xl mx-auto py-8">
                <div className="mb-8">
                    <h1 className="text-3xl font-bold tracking-tight mb-2">New Self-Assessment</h1>
                    <p className="text-muted-foreground">Choose a period and template to start your performance evaluation.</p>
                </div>

                <Card className="glass-panel border-border/30">
                    <CardHeader>
                        <CardTitle>Assessment Details</CardTitle>
                        <CardDescription>Enter the period and select the appropriate rubric.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="period">Review Period</Label>
                            <div className="relative">
                                <Calendar className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    id="period"
                                    placeholder="e.g., Annual Review 2024"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    className="pl-9"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="template">Rubric Template</Label>
                            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger id="template" className="w-full">
                                    <div className="flex items-center gap-2">
                                        <Layout className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Select a template" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent>
                                    {templatesLoading ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    ) : (
                                        templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            className="w-full glow-primary"
                            disabled={!selectedTemplate || !period || isCreating}
                            onClick={handleCreate}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Start Assessment'
                            )}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Active Assessment Form View
    const isApproved = assessment?.status === 'director_approved';
    const isAcknowledged = assessment?.status === 'acknowledged';
    const isReadOnly = assessment?.status !== 'draft' && assessment?.status !== 'rejected';
    const showComparison = isApproved || isAcknowledged;

    return (
        <div className="max-w-5xl mx-auto py-8">
            {/* Feedback Bar */}
            {isReadOnly && (
                <Alert className={cn(
                    "mb-6",
                    isAcknowledged ? "bg-emerald-500/5 border-emerald-500/20" : "bg-primary/5 border-primary/20"
                )}>
                    {isAcknowledged ? <ShieldCheck className="h-4 w-4 text-emerald-600" /> : <AlertCircle className="h-4 w-4 text-primary" />}
                    <AlertTitle>{isAcknowledged ? "Assessment Completed" : "View Only Mode"}</AlertTitle>
                    <AlertDescription>
                        {isAcknowledged
                            ? "This assessment cycle is complete. You have acknowledged the final results."
                            : `This assessment has been submitted and is currently ${assessment.status.replace('_', ' ')}.`}
                    </AlertDescription>
                </Alert>
            )}

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.push('/dashboard')}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">{assessment?.period}</h1>
                        <p className="text-muted-foreground">Self-Assessment Performance Evaluation</p>
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={saveDraft} disabled={saving}>
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Draft
                        </Button>
                        <Button className="glow-primary" onClick={submitAssessment} disabled={saving}>
                            <Send className="h-4 w-4 mr-2" />
                            Submit Assessment
                        </Button>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content: Sections */}
                <div className="lg:col-span-2 space-y-8">
                    {showComparison ? (
                        <>
                            {sections.map((section) => (
                                <ReviewComparisonSection
                                    key={section.id}
                                    readonly={true}
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

                            {/* Staff Acknowledgement Section */}
                            <Card className="glass-panel border-border/30 overflow-hidden shadow-lg">
                                <CardHeader className="bg-primary/5 border-b border-border/10">
                                    <div className="flex items-center gap-2">
                                        <MessageSquare className="h-5 w-5 text-primary" />
                                        <CardTitle className="text-lg">Staff Acknowledgement</CardTitle>
                                    </div>
                                    <CardDescription>Final response and acknowledgement of the performance review.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-6">
                                    {isAcknowledged ? (
                                        <div className="space-y-4">
                                            <div className="p-4 rounded-xl bg-muted/30 border border-border/50 text-foreground whitespace-pre-wrap text-sm">
                                                {staffAcknowledgement || <span className="text-muted-foreground italic">No feedback provided</span>}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-emerald-600 font-semibold bg-emerald-50 border border-emerald-100 p-3 rounded-lg">
                                                <ShieldCheck className="h-4 w-4" />
                                                Acknowledged and completed
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl text-amber-800 text-sm flex gap-3">
                                                <Info className="h-5 w-5 shrink-0" />
                                                <p>
                                                    Please review the final scores and feedback from your manager and director.
                                                    Provide your final response below to acknowledge this assessment.
                                                </p>
                                            </div>

                                            <div className="space-y-3">
                                                <Label htmlFor="staff-feedback" className="text-sm font-semibold">Final Response / Feedback <span className="text-destructive">*</span></Label>
                                                <Textarea
                                                    id="staff-feedback"
                                                    placeholder="Enter your final comments or any response to the feedback received..."
                                                    className="min-h-[150px] bg-background border-primary/20 focus-visible:ring-primary/30"
                                                    value={staffAcknowledgement}
                                                    onChange={(e) => setStaffAcknowledgement(e.target.value)}
                                                />
                                            </div>

                                            <Button
                                                className="w-full glow-primary h-12 text-base font-bold"
                                                onClick={acknowledgeAssessment}
                                                disabled={saving || !staffAcknowledgement.trim()}
                                            >
                                                {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <ShieldCheck className="h-5 w-5 mr-2" />}
                                                Finalize & Acknowledge
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        sections.map((section) => (
                            <AssessmentSection
                                key={section.id}
                                section={section}
                                onIndicatorChange={updateIndicator}
                                readonly={isReadOnly}
                            />
                        ))
                    )}
                </div>

                {/* Sidebar: Progress & Score */}
                <div className="space-y-6">
                    <div className="sticky top-24 space-y-6">
                        <Card className="glass-panel border-border/30">
                            <CardHeader>
                                <CardTitle className="text-lg">Assessment Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AssessmentProgress status={assessment?.status || 'draft'} />
                            </CardContent>
                        </Card>

                        <WeightedScoreDisplay
                            sections={sections}
                            score={showComparison ? finalWeightedScore : weightedScore}
                            label={showComparison ? "Confirmed Final Grade" : "Projected Grade"}
                            type={showComparison ? "manager" : "staff"}
                        />

                        <Card className="bg-primary/5 border-primary/10">
                            <CardContent className="pt-6">
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                    Your progress is automatically saved as you fill out the form.
                                    Click <strong>Save Draft</strong> if you want to explicitly save
                                    your current state before leaving.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default function AssessmentPage() {
    return (
        <ProtectedRoute>
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
                        <AssessmentContent />
                    </Suspense>
                </main>
            </div>
        </ProtectedRoute>
    );
}
