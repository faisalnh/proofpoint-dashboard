'use client';

import { useState, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useRubricTemplates } from '@/hooks/useAssessment';
import { api } from '@/lib/api-client';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import {
    FileText,
    Loader2,
    Plus,
    Layout,
    Layers,
    ChevronRight,
    Info,
    Target,
    Edit3,
    Trash2,
    Save,
    X,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

function RubricsContent() {
    const { templates, loading, refreshTemplates } = useRubricTemplates() as any;
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<any>(null);

    const handleSelectTemplate = async (template: any) => {
        if (selectedTemplate?.id === template.id) return;

        setIsEditMode(false);
        // If it's a template from the list, it might not have sections
        if (!template.sections) {
            setIsDetailLoading(true);
            setSelectedTemplate(template);
            const { data, error } = await api.getRubric(template.id);
            if (!error && data) {
                setSelectedTemplate(data);
            }
            setIsDetailLoading(false);
        } else {
            setSelectedTemplate(template);
        }
    };

    const handleEditToggle = () => {
        if (!isEditMode) {
            setEditData(JSON.parse(JSON.stringify(selectedTemplate)));
        }
        setIsEditMode(!isEditMode);
    };

    const handleSaveTemplate = async () => {
        setIsDetailLoading(true);
        // Save template metadata
        const { error: templateError } = await api.updateRubric(editData.id, {
            name: editData.name,
            description: editData.description
        });

        if (templateError) {
            toast({ title: "Error", description: "Failed to update rubric metadata", variant: "destructive" });
            setIsDetailLoading(false);
            return;
        }

        toast({ title: "Success", description: "Rubric updated successfully" });
        setSelectedTemplate(editData);
        setIsEditMode(false);
        setIsDetailLoading(false);
        if (refreshTemplates) refreshTemplates();
    };

    const handleUpdateSection = async (sectionId: string, updates: any) => {
        const { data, error } = await api.updateSection(sectionId, updates);
        if (error) {
            toast({ title: "Error", description: "Failed to update section", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                sections: prev.sections.map((s: any) => s.id === sectionId ? { ...s, ...data } : s)
            }));
        }
    };

    const handleAddSection = async () => {
        const { data, error } = await api.createSection({
            template_id: selectedTemplate.id,
            name: "New Section",
            weight: 0,
            sort_order: (editData.sections?.length || 0)
        });

        if (error) {
            toast({ title: "Error", description: "Failed to add section", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                sections: [...(prev.sections || []), { ...data, indicators: [] }]
            }));
        }
    };

    const handleDeleteSection = async (sectionId: string) => {
        if (!confirm("Are you sure you want to delete this section and all its indicators?")) return;

        const { error } = await api.deleteSection(sectionId);
        if (error) {
            toast({ title: "Error", description: "Failed to delete section", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                sections: prev.sections.filter((s: any) => s.id !== sectionId)
            }));
        }
    };

    const handleUpdateIndicator = async (indicatorId: string, updates: any) => {
        const { data, error } = await api.updateIndicator(indicatorId, updates);
        if (error) {
            toast({ title: "Error", description: "Failed to update indicator", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                sections: prev.sections.map((s: any) => ({
                    ...s,
                    indicators: s.indicators.map((i: any) => i.id === indicatorId ? { ...i, ...data } : i)
                }))
            }));
        }
    };

    const handleAddIndicator = async (sectionId: string) => {
        const section = editData.sections.find((s: any) => s.id === sectionId);
        const { data, error } = await api.createIndicator({
            section_id: sectionId,
            name: "New Indicator",
            description: "",
            sort_order: (section.indicators?.length || 0)
        });

        if (error) {
            toast({ title: "Error", description: "Failed to add indicator", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                sections: prev.sections.map((s: any) => s.id === sectionId ? {
                    ...s,
                    indicators: [...(s.indicators || []), data]
                } : s)
            }));
        }
    };

    const handleDeleteIndicator = async (indicatorId: string, sectionId: string) => {
        const { error } = await api.deleteIndicator(indicatorId);
        if (error) {
            toast({ title: "Error", description: "Failed to delete indicator", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                sections: prev.sections.map((s: any) => s.id === sectionId ? {
                    ...s,
                    indicators: s.indicators.filter((i: any) => i.id !== indicatorId)
                } : s)
            }));
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading evaluation rubrics...</p>
            </div>
        );
    }

    const currentData = isEditMode ? editData : selectedTemplate;

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">Performance Rubrics</h1>
                    <p className="text-muted-foreground">Standardized criteria for organizational performance evaluation.</p>
                </div>
                {!isEditMode && (
                    <Button className="glow-primary">
                        <Plus className="h-4 w-4 mr-2" />
                        New Template
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Template List */}
                <div className="lg:col-span-4 space-y-4">
                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">Templates</h3>
                    {templates.map((template: any) => (
                        <Card
                            key={template.id}
                            onClick={() => !isEditMode && handleSelectTemplate(template)}
                            className={`cursor-pointer transition-all duration-300 hover:shadow-md ${selectedTemplate?.id === template.id
                                ? 'border-primary ring-1 ring-primary/20 bg-primary/[0.02]'
                                : isEditMode ? 'opacity-50 cursor-not-allowed' : 'hover:border-primary/30 border-border/50'
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
                    {currentData ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-500">
                            <Card className="glass-panel border-border/30">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1 mr-4">
                                            {isEditMode ? (
                                                <div className="space-y-3">
                                                    <Input
                                                        value={editData.name}
                                                        onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                                                        placeholder="Rubric Name"
                                                        className="text-2xl font-bold h-auto py-1 px-2"
                                                    />
                                                    <Textarea
                                                        value={editData.description || ''}
                                                        onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                        placeholder="Rubric Description"
                                                        className="mt-2 text-sm"
                                                    />
                                                </div>
                                            ) : (
                                                <>
                                                    <CardTitle className="text-2xl">{currentData.name}</CardTitle>
                                                    <CardDescription className="mt-2">{currentData.description}</CardDescription>
                                                </>
                                            )}
                                        </div>
                                        <div className="flex gap-2">
                                            {isEditMode ? (
                                                <>
                                                    <Button variant="outline" size="sm" onClick={handleEditToggle} disabled={isDetailLoading}>
                                                        <X className="h-4 w-4 mr-2" />
                                                        Cancel
                                                    </Button>
                                                    <Button size="sm" onClick={handleSaveTemplate} disabled={isDetailLoading}>
                                                        {isDetailLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                                        Save
                                                    </Button>
                                                </>
                                            ) : (
                                                <Button variant="outline" size="sm" onClick={handleEditToggle}>
                                                    <Edit3 className="h-4 w-4 mr-2" />
                                                    Edit Rubric
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isDetailLoading && !isEditMode ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            <span className="text-sm text-muted-foreground">Loading sections...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <Layers className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">{currentData.sections?.length || 0} Sections</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">
                                                    {(currentData.sections || []).reduce((acc: number, s: any) => acc + (s.indicators?.length || 0), 0)} Indicators
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <ScrollArea className="h-[600px] rounded-xl border border-border/30 bg-muted/10 p-4">
                                {isDetailLoading && !isEditMode ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                        <p className="text-muted-foreground">Loading evaluation criteria...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8 p-1">
                                        {(currentData.sections || []).map((section: any) => (
                                            <div key={section.id} className="space-y-4">
                                                <div className="flex items-center gap-3 sticky top-0 bg-background/80 backdrop-blur-md py-2 z-10 transition-all">
                                                    {isEditMode ? (
                                                        <div className="flex items-center gap-2 flex-1">
                                                            <Input
                                                                value={section.weight}
                                                                type="number"
                                                                onChange={(e) => handleUpdateSection(section.id, { weight: Number(e.target.value) })}
                                                                className="w-20 font-mono text-primary h-8 px-2"
                                                            />
                                                            <span className="text-primary mr-1">%</span>
                                                            <Input
                                                                value={section.name}
                                                                onChange={(e) => handleUpdateSection(section.id, { name: e.target.value })}
                                                                className="flex-1 font-bold h-8 px-2"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDeleteSection(section.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <>
                                                            <Badge variant="outline" className="font-mono text-primary border-primary/20">{section.weight}%</Badge>
                                                            <h4 className="text-lg font-bold">{section.name}</h4>
                                                            <div className="h-px flex-1 bg-border/50" />
                                                        </>
                                                    )}
                                                </div>

                                                <div className="grid gap-4">
                                                    {(section.indicators || []).map((indicator: any) => (
                                                        <div
                                                            key={indicator.id}
                                                            className="group p-4 rounded-xl bg-background border border-border/50 hover:border-primary/30 hover:bg-primary/[0.01] transition-all"
                                                        >
                                                            <div className="flex items-start gap-4">
                                                                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center text-xs font-mono font-bold group-hover:bg-primary/20 group-hover:text-primary transition-colors">
                                                                    {(indicator.sort_order || 0) + 1}
                                                                </div>
                                                                <div className="flex-1">
                                                                    {isEditMode ? (
                                                                        <div className="space-y-3">
                                                                            <div className="flex items-start justify-between gap-2">
                                                                                <Input
                                                                                    value={indicator.name}
                                                                                    onChange={(e) => handleUpdateIndicator(indicator.id, { name: e.target.value })}
                                                                                    className="font-semibold h-8 px-2"
                                                                                />
                                                                                <Button
                                                                                    variant="ghost"
                                                                                    size="icon"
                                                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                                    onClick={() => handleDeleteIndicator(indicator.id, section.id)}
                                                                                >
                                                                                    <Trash2 className="h-4 w-4" />
                                                                                </Button>
                                                                            </div>
                                                                            <Textarea
                                                                                value={indicator.description || ''}
                                                                                onChange={(e) => handleUpdateIndicator(indicator.id, { description: e.target.value })}
                                                                                placeholder="Indicator Description"
                                                                                className="text-sm min-h-[60px]"
                                                                            />
                                                                            <div className="flex items-start gap-2 p-2 rounded-lg bg-muted/50 border border-border/30">
                                                                                <Info className="h-3.5 w-3.5 text-primary mt-2" />
                                                                                <Input
                                                                                    value={indicator.evidence_guidance || ''}
                                                                                    onChange={(e) => handleUpdateIndicator(indicator.id, { evidence_guidance: e.target.value })}
                                                                                    placeholder="Evidence Guidance..."
                                                                                    className="bg-transparent border-none text-xs h-7 p-0 focus-visible:ring-0"
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        <>
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
                                                                        </>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                    {isEditMode && (
                                                        <Button
                                                            variant="outline"
                                                            className="border-dashed border-2 py-6 rounded-xl hover:border-primary/50 hover:bg-primary/[0.02]"
                                                            onClick={() => handleAddIndicator(section.id)}
                                                        >
                                                            <Plus className="h-4 w-4 mr-2" />
                                                            Add Indicator
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                        {isEditMode && (
                                            <Button
                                                className="w-full py-8 border-dashed border-2 rounded-xl text-lg font-bold"
                                                variant="outline"
                                                onClick={handleAddSection}
                                            >
                                                <Plus className="h-6 w-6 mr-2" />
                                                Add New Section
                                            </Button>
                                        )}
                                    </div>
                                )}
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
