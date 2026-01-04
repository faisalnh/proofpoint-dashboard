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
        domains,
        loading: assessmentLoading,
        saving,
        saveDraft,
        submitAssessment,
        updateKPI,
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

    const weightedScore = calculateWeightedScore(domains, 'staff');
    const finalWeightedScore = calculateWeightedScore(domains, 'manager');

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
                    <h1 className="text-4xl font-black tracking-tight mb-2">Self-Assessment</h1>
                    <p className="text-muted-foreground text-lg">Choose a period and template to start your performance evaluation within the Framework.</p>
                </div>

                <Card className="glass-panel border-border/30 shadow-2xl overflow-hidden">
                    <div className="h-2 bg-primary w-full" />
                    <CardHeader className="pb-4">
                        <CardTitle className="text-2xl">New Assessment Cycle</CardTitle>
                        <CardDescription>Enter the review period details and select your functional rubric.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6 pt-2">
                        <div className="space-y-3">
                            <Label htmlFor="period" className="font-bold">Review Period</Label>
                            <div className="relative group">
                                <Calendar className="absolute left-3 top-3 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                <Input
                                    id="period"
                                    placeholder="e.g., Annual Review 2024"
                                    value={period}
                                    onChange={(e) => setPeriod(e.target.value)}
                                    className="pl-9 h-11 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20"
                                />
                            </div>
                        </div>

                        <div className="space-y-3">
                            <Label htmlFor="template" className="font-bold">Functional Rubric</Label>
                            <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                                <SelectTrigger id="template" className="w-full h-11 bg-muted/30 border-muted-foreground/20 focus-visible:ring-primary/20">
                                    <div className="flex items-center gap-2">
                                        <Layout className="h-4 w-4 text-muted-foreground" />
                                        <SelectValue placeholder="Select a framework template" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="glass-panel">
                                    {templatesLoading ? (
                                        <div className="flex items-center justify-center p-4">
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        </div>
                                    ) : (
                                        templates.map((t) => (
                                            <SelectItem key={t.id} value={t.id} className="focus:bg-primary focus:text-white">
                                                <div className="flex flex-col py-1">
                                                    <span className="font-bold">{t.name}</span>
                                                    <span className="text-[10px] opacity-70">Comprehensive KPI Framework</span>
                                                </div>
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>

                        <Button
                            className="w-full h-12 text-base font-bold transition-all duration-300 shadow-lg hover:shadow-primary/20"
                            disabled={!selectedTemplate || !period || isCreating}
                            onClick={handleCreate}
                        >
                            {isCreating ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Initializing...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4 mr-2" />
                                    Start Performance Review
                                </>
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
        <div className="max-w-7xl mx-auto py-8">
            {/* Feedback Bar */}
            {isReadOnly && (
                <Alert className={cn(
                    "mb-8 border-2 shadow-sm animate-in fade-in slide-in-from-top-4 duration-500",
                    isAcknowledged ? "bg-emerald-50 border-emerald-500/30" : "bg-primary/5 border-primary/20"
                )}>
                    {isAcknowledged ? <ShieldCheck className="h-5 w-5 text-emerald-600" /> : <AlertCircle className="h-5 w-5 text-primary" />}
                    <AlertTitle className="font-bold text-lg mb-1">{isAcknowledged ? "Cycle Complete" : "Review in Progress"}</AlertTitle>
                    <AlertDescription className="text-base">
                        {isAcknowledged
                            ? "This assessment cycle is complete. Final results have been archived."
                            : `This assessment has been submitted and is currently ${assessment?.status?.replace('_', ' ') || 'pending'}.`}
                    </AlertDescription>
                </Alert>
            )}

            {/* Header Actions */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="flex items-center gap-6">
                    <Button variant="outline" size="icon" onClick={() => router.push('/dashboard')} className="h-12 w-12 rounded-xl shadow-sm hover:bg-muted/50 border-muted-foreground/20">
                        <ArrowLeft className="h-6 w-6" />
                    </Button>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <h1 className="text-4xl font-black tracking-tight">{assessment?.period}</h1>
                            {isReadOnly && <Badge variant="secondary" className="bg-muted-foreground/10 text-muted-foreground font-mono">READ ONLY</Badge>}
                        </div>
                        <p className="text-muted-foreground text-lg italic">KPI-Based Self-Assessment & Performance Framework</p>
                    </div>
                </div>

                {!isReadOnly && (
                    <div className="flex items-center gap-4">
                        <Button variant="outline" onClick={saveDraft} disabled={saving} className="h-12 px-6 rounded-xl border-primary/20 hover:bg-primary/5 transition-all">
                            {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                            Save Draft
                        </Button>
                        <Button className="h-12 px-8 rounded-xl font-bold glow-primary transition-all duration-300" onClick={submitAssessment} disabled={saving}>
                            <Send className="h-4 w-4 mr-2" />
                            Submit Review
                        </Button>
                    </div>
                )}
            </div>

            <div className="mb-10">
                <Card className="glass-panel border-border/30 shadow-lg overflow-hidden">
                    <CardHeader className="pb-4">
                        <CardTitle className="text-xl font-bold flex items-center gap-2">
                            <Layout className="h-5 w-5 text-primary" />
                            Cycle Progress
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="pb-8">
                        <AssessmentProgress status={assessment?.status || 'draft'} />
                    </CardContent>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Main Content: Domains */}
                <div className="lg:col-span-8 space-y-10">
                    {showComparison ? (
                        <>
                            {domains.map((domain) => (
                                <ReviewComparisonSection
                                    key={domain.id}
                                    readonly={true}
                                    section={{
                                        ...domain,
                                        standards: domain.standards.map(s => ({
                                            ...s,
                                            kpis: s.kpis.map(k => ({
                                                ...k,
                                                staffScore: k.score,
                                                staffEvidence: k.evidence,
                                                managerScore: k.managerScore ?? null,
                                                managerEvidence: k.managerEvidence ?? ''
                                            }))
                                        }))
                                    }}
                                />
                            ))}

                            {/* Staff Acknowledgement Section */}
                            <Card className="glass-panel border-border/30 overflow-hidden shadow-2xl">
                                <CardHeader className="bg-primary/5 border-b border-border/10 pb-6 pt-8 px-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 rounded-lg bg-primary/10 text-primary">
                                            <MessageSquare className="h-6 w-6" />
                                        </div>
                                        <CardTitle className="text-2xl font-black">Staff Acknowledgement</CardTitle>
                                    </div>
                                    <CardDescription className="text-base mt-2">Final response and signature for the performance review cycle.</CardDescription>
                                </CardHeader>
                                <CardContent className="pt-8 px-8 pb-10">
                                    {isAcknowledged ? (
                                        <div className="space-y-6">
                                            <div className="relative">
                                                <div className="absolute top-0 left-0 w-1 h-full bg-primary/20 rounded-full" />
                                                <div className="pl-6 py-2">
                                                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">My Final Comments</span>
                                                    <p className="text-base text-foreground leading-relaxed whitespace-pre-wrap">
                                                        {staffAcknowledgement || <span className="text-muted-foreground italic">No feedback provided</span>}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-500/20 text-emerald-700">
                                                <ShieldCheck className="h-6 w-6" />
                                                <div className="text-sm font-bold">
                                                    Electronically Signed & Acknowledged
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            <div className="bg-amber-50 border-l-4 border-amber-400 p-5 rounded-r-xl text-amber-900 shadow-sm">
                                                <div className="flex gap-4">
                                                    <Info className="h-6 w-6 text-amber-500 shrink-0" />
                                                    <div className="space-y-1">
                                                        <p className="font-bold text-base">Framework Review Complete</p>
                                                        <p className="text-sm opacity-80 leading-relaxed">
                                                            Please review the final results and manager feedback across all domains.
                                                            Provide your signature and any final reflections below to conclude this cycle.
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="space-y-4">
                                                <Label htmlFor="staff-feedback" className="text-base font-bold flex items-center gap-2">
                                                    Reflections & Acknowledgement <span className="text-destructive">*</span>
                                                </Label>
                                                <Textarea
                                                    id="staff-feedback"
                                                    placeholder="Enter your final reflections on the review period, accomplishments, and alignment with the framework..."
                                                    className="min-h-[200px] bg-background border-primary/20 focus-visible:ring-primary/40 text-base leading-relaxed p-4 shadow-inner"
                                                    value={staffAcknowledgement}
                                                    onChange={(e) => setStaffAcknowledgement(e.target.value)}
                                                />
                                            </div>

                                            <Button
                                                className="w-full h-14 text-lg font-black tracking-wide shadow-xl hover:shadow-primary/30 transition-all duration-300"
                                                onClick={acknowledgeAssessment}
                                                disabled={saving || !staffAcknowledgement.trim()}
                                            >
                                                {saving ? <Loader2 className="h-6 w-6 animate-spin mr-3" /> : <ShieldCheck className="h-6 w-6 mr-3" />}
                                                Finalize Cycle & Sign Results
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    ) : (
                        domains.map((domain) => (
                            <AssessmentSection
                                key={domain.id}
                                section={domain}
                                onIndicatorChange={updateKPI}
                                readonly={isReadOnly}
                            />
                        ))
                    )}
                </div>

                {/* Sidebar: Progress & Score */}
                <div className="lg:col-span-4 space-y-8">
                    <div className="sticky top-24 space-y-8">
                        <WeightedScoreDisplay
                            domains={domains}
                            score={showComparison ? finalWeightedScore : weightedScore}
                            label={showComparison ? "Final Score" : "Projected Score"}
                            type={showComparison ? "manager" : "staff"}
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
