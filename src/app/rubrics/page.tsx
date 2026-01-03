'use client';

import { useState, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRubricTemplates } from '@/hooks/useAssessment';
import {
    FileText,
    Loader2,
    Plus,
    Layout,
    Layers,
    ChevronRight,
    Info,
    ExternalLink,
    Target
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

function RubricsContent() {
    const { templates, loading } = useRubricTemplates();
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading evaluation rubrics...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Performance Rubrics</h1>
                    <p className="text-muted-foreground">Standardized criteria for organizational performance evaluation.</p>
                </div>
                <Button className="glow-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    New Template
                </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Template List */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Templates</h3>
                    {templates.map((template) => (
                        <Card
                            key={template.id}
                            onClick={() => setSelectedTemplate(template)}
                            className={`cursor-pointer transition-all duration-300 hover:shadow-md ${selectedTemplate?.id === template.id
                                    ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.02]'
                                    : 'hover:border-primary/30 border-border/50'
                                }`}
                        >
                            <CardContent className="p-4">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${selectedTemplate?.id === template.id ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                                        }`}>
                                        <Layout className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-foreground truncate">{template.name}</h4>
                                        <p className="text-xs text-muted-foreground truncate">{template.description || 'No description'}</p>
                                    </div>
                                    {selectedTemplate?.id === template.id && <ChevronRight className="h-4 w-4 text-primary" />}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Right: Template Detail */}
                <div className="lg:col-span-8">
                    {selectedTemplate ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <Card className="glass-panel border-border/30">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <CardTitle className="text-2xl">{selectedTemplate.name}</CardTitle>
                                            <CardDescription className="mt-2">{selectedTemplate.description}</CardDescription>
                                        </div>
                                        <Button variant="outline" size="sm">
                                            <ExternalLink className="h-4 w-4 mr-2" />
                                            Export PDF
                                        </Button>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex items-center gap-6">
                                        <div className="flex items-center gap-2">
                                            <Layers className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium">{selectedTemplate.sections.length} Sections</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Target className="h-4 w-4 text-primary" />
                                            <span className="text-sm font-medium">
                                                {selectedTemplate.sections.reduce((acc: number, s: any) => acc + s.indicators.length, 0)} Indicators
                                            </span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <ScrollArea className="h-[600px] rounded-xl border border-border/30 bg-muted/10 p-4">
                                <div className="space-y-8 p-1">
                                    {selectedTemplate.sections.map((section: any) => (
                                        <div key={section.id} className="space-y-4">
                                            <div className="flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-md py-2 z-10">
                                                <Badge variant="outline" className="font-mono text-primary border-primary/20">{section.weight}%</Badge>
                                                <h4 className="text-lg font-bold">{section.name}</h4>
                                                <div className="h-px flex-1 bg-border/50" />
                                            </div>

                                            <div className="grid gap-4">
                                                {section.indicators.map((indicator: any) => (
                                                    <div
                                                        key={indicator.id}
                                                        className="group p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:bg-primary/[0.01] transition-all"
                                                    >
                                                        <div className="flex items-start gap-4">
                                                            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-mono font-bold group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                                {indicator.sort_order + 1}
                                                            </div>
                                                            <div className="flex-1">
                                                                <h5 className="font-semibold text-foreground mb-1">{indicator.name}</h5>
                                                                <p className="text-sm text-muted-foreground leading-relaxed">{indicator.description}</p>

                                                                {indicator.evidence_guidance && (
                                                                    <div className="mt-3 flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                                                                        <Info className="h-3.5 w-3.5 text-primary mt-0.5" />
                                                                        <p className="text-xs text-muted-foreground">
                                                                            <span className="font-semibold text-foreground mr-1">Evidence Guidance:</span>
                                                                            {indicator.evidence_guidance}
                                                                        </p>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </ScrollArea>
                        </div>
                    ) : (
                        <Card className="h-[400px] flex flex-col items-center justify-center border-dashed border-border/50 bg-muted/5">
                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-4">
                                <FileText className="h-10 w-10 text-muted-foreground opacity-50" />
                            </div>
                            <h3 className="text-xl font-semibold text-muted-foreground">Select a Template</h3>
                            <p className="text-muted-foreground max-w-xs text-center mt-2">
                                Click on a rubric template from the list to view its sections and evaluation criteria.
                            </p>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function RubricsPage() {
    return (
        <ProtectedRoute requiredRoles={['manager', 'director', 'admin']}>
            <div className="min-h-screen bg-background relative">
                <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
                <Header />
                <main className="container relative px-4 py-8">
                    <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin fixed top-1/2 left-1/2" />}>
                        <RubricsContent />
                    </Suspense>
                </main>
            </div>
        </ProtectedRoute>
    );
}
