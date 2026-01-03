'use client';

import { useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import {
    AssessmentSection,
    AssessmentProgress,
    WeightedScoreDisplay
} from '@/components/assessment';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
    AlertCircle
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
        updateIndicator
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

    const weightedScore = calculateWeightedScore(sections);

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
    const isReadOnly = assessment?.status !== 'draft' && assessment?.status !== 'rejected';

    return (
        <div className="max-w-5xl mx-auto py-8">
            {/* Feedback Bar */}
            {isReadOnly && (
                <Alert className="mb-6 bg-primary/5 border-primary/20">
                    <AlertCircle className="h-4 w-4 text-primary" />
                    <AlertTitle>View Only Mode</AlertTitle>
                    <AlertDescription>
                        This assessment has been submitted and is currently {assessment.status.replace('_', ' ')}.
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
                    {sections.map((section) => (
                        <AssessmentSection
                            key={section.id}
                            section={section}
                            onIndicatorChange={updateIndicator}
                            readonly={isReadOnly}
                        />
                    ))}
                </div>

                {/* Sidebar: Progress & Score */}
                <div className="space-y-6">
                    <div className="sticky top-24 space-y-6">
                        <Card className="glass-panel border-border/30">
                            <CardHeader>
                                <CardTitle className="text-lg">Assessment Progress</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <AssessmentProgress sections={sections} />
                            </CardContent>
                        </Card>

                        <WeightedScoreDisplay
                            score={weightedScore}
                            label="Projected Grade"
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
