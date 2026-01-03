'use client';

import { useState, useEffect, Suspense } from 'react';
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
    calculateWeightedScore
} from '@/hooks/useAssessment';
import {
    Building2,
    ChevronRight,
    ArrowLeft,
    Loader2,
    CheckCircle2,
    Search,
    ShieldCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import { useAuth } from '@/hooks/useAuth';

function DirectorContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const assessmentId = searchParams.get('id');
    const { user } = useAuth();

    const [assessments, setAssessments] = useState<any[]>([]);
    const [loadingList, setLoadingList] = useState(true);
    const { assessment, sections, loading: assessmentLoading } = useAssessment(assessmentId || undefined);
    const [searchTerm, setSearchTerm] = useState('');

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

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'manager_reviewed':
                return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Pending Approval</Badge>;
            case 'director_approved':
                return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">Approved</Badge>;
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
        if (assessmentLoading) {
            return (
                <div className="flex flex-col items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground">Loading assessment details...</p>
                </div>
            );
        }

        const staffScore = calculateWeightedScore(sections);

        return (
            <div className="max-w-5xl mx-auto py-8">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push('/director')}>
                            <ArrowLeft className="h-5 w-5" />
                        </Button>
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Badge variant="secondary" className="font-mono">{assessment?.period}</Badge>
                                {getStatusBadge(assessment?.status || '')}
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight">Director Review: {assessment?.staff_name || 'Staff Assessment'}</h1>
                            <p className="text-muted-foreground">Final oversight for organizational performance</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-600/20">
                            <ShieldCheck className="h-4 w-4 mr-2" />
                            Approve Assessment
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-8">
                        {sections.map((section) => (
                            <ReviewComparisonSection
                                key={section.id}
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
                    </div>

                    <div className="space-y-6">
                        <div className="sticky top-24 space-y-6">
                            <Card className="glass-panel border-border/30 overflow-hidden">
                                <div className="h-1 bg-emerald-500" />
                                <CardHeader>
                                    <CardTitle className="text-lg">Executive Summary</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-muted-foreground">Staff Score</span>
                                        <span className="font-mono font-bold text-lg">{staffScore?.toFixed(2) || '-.--'}</span>
                                    </div>
                                    {/* We could add manager score here if available in the hook */}
                                    <div className="pt-4 border-t border-border/50">
                                        <p className="text-xs text-muted-foreground italic">
                                            This view compares self-assessment scores with manager review scores.
                                            As Director, your approval confirms the final performance evaluation.
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>

                            <WeightedScoreDisplay
                                score={staffScore}
                                label="Final Performance Score"
                            />
                        </div>
                    </div>
                </div>
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
