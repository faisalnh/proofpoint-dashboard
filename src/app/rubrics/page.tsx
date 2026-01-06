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
    ChevronDown,
    Info,
    Target,
    Edit3,
    Trash2,
    Save,
    X,
    BookOpen,
    Award,
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

function RubricsContent() {
    const { templates, loading, refreshTemplates } = useRubricTemplates() as any;
    const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
    const [isDetailLoading, setIsDetailLoading] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const [editData, setEditData] = useState<any>(null);
    const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
    const [expandedStandards, setExpandedStandards] = useState<Set<string>>(new Set());
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

    const handleSelectTemplate = async (template: any) => {
        if (selectedTemplate?.id === template.id) return;

        setIsEditMode(false);
        setExpandedDomains(new Set());
        setExpandedStandards(new Set());

        if (!template.domains) {
            setIsDetailLoading(true);
            setSelectedTemplate(template);
            const { data, error } = await api.getRubric(template.id);
            if (!error && data) {
                setSelectedTemplate(data);
                // Auto-expand all domains
                const allDomainIds = ((data as any).domains || []).map((d: any) => d.id);
                setExpandedDomains(new Set(allDomainIds));
            }
            setIsDetailLoading(false);
        } else {
            setSelectedTemplate(template);
            const allDomainIds = (template.domains || []).map((d: any) => d.id);
            setExpandedDomains(new Set(allDomainIds));
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

    const handleDeleteRubric = async () => {
        if (!selectedTemplate) return;

        setIsDetailLoading(true);
        const { error } = await api.deleteRubric(selectedTemplate.id);

        if (error) {
            toast({ title: "Error", description: "Failed to delete rubric. It might be in use by existing assessments.", variant: "destructive" });
        } else {
            toast({ title: "Success", description: "Rubric deleted successfully" });
            setSelectedTemplate(null);
            setIsEditMode(false);
            if (refreshTemplates) refreshTemplates();
        }
        setIsDetailLoading(false);
        setDeleteConfirmOpen(false);
    };

    const toggleDomain = (domainId: string) => {
        setExpandedDomains(prev => {
            const next = new Set(prev);
            if (next.has(domainId)) {
                next.delete(domainId);
            } else {
                next.add(domainId);
            }
            return next;
        });
    };

    const toggleStandard = (standardId: string) => {
        setExpandedStandards(prev => {
            const next = new Set(prev);
            if (next.has(standardId)) {
                next.delete(standardId);
            } else {
                next.add(standardId);
            }
            return next;
        });
    };

    // Domain CRUD handlers
    const handleAddDomain = async () => {
        const { data, error } = await api.createDomain({
            template_id: selectedTemplate.id,
            name: "New Domain",
            sort_order: (editData.domains?.length || 0)
        });

        if (error) {
            toast({ title: "Error", description: "Failed to add domain", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: [...(prev.domains || []), { ...(data as Record<string, unknown>), standards: [] }]
            }));
            setExpandedDomains(prev => new Set([...prev, (data as any).id]));
        }
    };

    const handleUpdateDomain = async (domainId: string, updates: any) => {
        const { data, error } = await api.updateDomain(domainId, updates);
        if (error) {
            toast({ title: "Error", description: "Failed to update domain", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.map((d: any) => d.id === domainId ? { ...d, ...data } : d)
            }));
        }
    };

    const handleDeleteDomain = async (domainId: string) => {
        if (!confirm("Are you sure you want to delete this domain and all its standards and KPIs?")) return;

        const { error } = await api.deleteDomain(domainId);
        if (error) {
            toast({ title: "Error", description: "Failed to delete domain", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.filter((d: any) => d.id !== domainId)
            }));
        }
    };

    // Standard CRUD handlers
    const handleAddStandard = async (domainId: string) => {
        const domain = editData.domains.find((d: any) => d.id === domainId);
        const { data, error } = await api.createStandard({
            domain_id: domainId,
            name: "New Standard",
            sort_order: (domain.standards?.length || 0)
        });

        if (error) {
            toast({ title: "Error", description: "Failed to add standard", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.map((d: any) => d.id === domainId ? {
                    ...d,
                    standards: [...(d.standards || []), { ...(data as Record<string, unknown>), kpis: [] }]
                } : d)
            }));
            setExpandedStandards(prev => new Set([...prev, (data as any).id]));
        }
    };

    const handleUpdateStandard = async (standardId: string, updates: any) => {
        const { data, error } = await api.updateStandard(standardId, updates);
        if (error) {
            toast({ title: "Error", description: "Failed to update standard", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.map((d: any) => ({
                    ...d,
                    standards: d.standards.map((s: any) => s.id === standardId ? { ...s, ...data } : s)
                }))
            }));
        }
    };

    const handleDeleteStandard = async (standardId: string, domainId: string) => {
        if (!confirm("Are you sure you want to delete this standard and all its KPIs?")) return;

        const { error } = await api.deleteStandard(standardId);
        if (error) {
            toast({ title: "Error", description: "Failed to delete standard", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.map((d: any) => d.id === domainId ? {
                    ...d,
                    standards: d.standards.filter((s: any) => s.id !== standardId)
                } : d)
            }));
        }
    };

    // KPI CRUD handlers
    const handleAddKPI = async (standardId: string) => {
        let standard: any = null;
        editData.domains.forEach((d: any) => {
            const found = d.standards.find((s: any) => s.id === standardId);
            if (found) standard = found;
        });

        const { data, error } = await api.createKPI({
            standard_id: standardId,
            name: "New KPI",
            description: "",
            evidence_guidance: "",
            trainings: "",
            sort_order: (standard?.kpis?.length || 0),
            rubric_4: "≥95%",
            rubric_3: "80-94%",
            rubric_2: "60-79%",
            rubric_1: "<60%"
        });

        if (error) {
            toast({ title: "Error", description: "Failed to add KPI", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.map((d: any) => ({
                    ...d,
                    standards: d.standards.map((s: any) => s.id === standardId ? {
                        ...s,
                        kpis: [...(s.kpis || []), data]
                    } : s)
                }))
            }));
        }
    };

    const handleUpdateKPI = async (kpiId: string, updates: any) => {
        const { data, error } = await api.updateKPI(kpiId, updates);
        if (error) {
            toast({ title: "Error", description: "Failed to update KPI", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.map((d: any) => ({
                    ...d,
                    standards: d.standards.map((s: any) => ({
                        ...s,
                        kpis: s.kpis.map((k: any) => k.id === kpiId ? { ...k, ...data } : k)
                    }))
                }))
            }));
        }
    };

    const handleDeleteKPI = async (kpiId: string, standardId: string) => {
        const { error } = await api.deleteKPI(kpiId);
        if (error) {
            toast({ title: "Error", description: "Failed to delete KPI", variant: "destructive" });
        } else {
            setEditData((prev: any) => ({
                ...prev,
                domains: prev.domains.map((d: any) => ({
                    ...d,
                    standards: d.standards.map((s: any) => s.id === standardId ? {
                        ...s,
                        kpis: s.kpis.filter((k: any) => k.id !== kpiId)
                    } : s)
                }))
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

    // Count KPIs across all domains and standards
    const countKPIs = (domains: any[]) => {
        if (!domains) return 0;
        return domains.reduce((acc, d) =>
            acc + (d.standards || []).reduce((sacc: number, s: any) =>
                sacc + (s.kpis?.length || 0), 0), 0);
    };

    const countStandards = (domains: any[]) => {
        if (!domains) return 0;
        return domains.reduce((acc, d) => acc + (d.standards?.length || 0), 0);
    };

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight mb-2">KPI Framework</h1>
                    <p className="text-muted-foreground">Domain → Standard → KPI structure for performance evaluation.</p>
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
                                                <div className="flex gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleteConfirmOpen(true)}
                                                    >
                                                        <Trash2 className="h-4 w-4 mr-2" />
                                                        Delete
                                                    </Button>
                                                    <Button variant="outline" size="sm" onClick={handleEditToggle}>
                                                        <Edit3 className="h-4 w-4 mr-2" />
                                                        Edit
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {isDetailLoading && !isEditMode ? (
                                        <div className="flex items-center gap-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                            <span className="text-sm text-muted-foreground">Loading...</span>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-6">
                                            <div className="flex items-center gap-2">
                                                <BookOpen className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">{currentData.domains?.length || 0} Domains</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Award className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">{countStandards(currentData.domains)} Standards</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Target className="h-4 w-4 text-primary" />
                                                <span className="text-sm font-medium">{countKPIs(currentData.domains)} KPIs</span>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            <ScrollArea className="h-[600px] rounded-xl border border-border/30 bg-muted/10 p-4">
                                {isDetailLoading && !isEditMode ? (
                                    <div className="flex flex-col items-center justify-center h-full">
                                        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                                        <p className="text-muted-foreground">Loading KPI framework...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-6 p-1">
                                        {(currentData.domains || []).map((domain: any, domainIdx: number) => (
                                            <div key={domain.id} className="rounded-xl border border-border/50 bg-background overflow-hidden">
                                                {/* Domain Header */}
                                                <div
                                                    className="flex items-center gap-3 p-4 bg-primary/5 cursor-pointer hover:bg-primary/10 transition-colors"
                                                    onClick={() => toggleDomain(domain.id)}
                                                >
                                                    {expandedDomains.has(domain.id) ? (
                                                        <ChevronDown className="h-5 w-5 text-primary" />
                                                    ) : (
                                                        <ChevronRight className="h-5 w-5 text-primary" />
                                                    )}
                                                    <Badge variant="secondary" className="font-mono">D{domainIdx + 1}</Badge>
                                                    {isEditMode ? (
                                                        <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                                            <Input
                                                                value={domain.name}
                                                                onChange={(e) => handleUpdateDomain(domain.id, { name: e.target.value })}
                                                                className="flex-1 font-bold h-8 px-2"
                                                            />
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleDeleteDomain(domain.id)}
                                                            >
                                                                <Trash2 className="h-4 w-4" />
                                                            </Button>
                                                        </div>
                                                    ) : (
                                                        <h3 className="font-bold text-lg flex-1">{domain.name}</h3>
                                                    )}
                                                    <span className="text-xs text-muted-foreground">{domain.standards?.length || 0} standards</span>
                                                </div>

                                                {/* Domain Content (Standards) */}
                                                {expandedDomains.has(domain.id) && (
                                                    <div className="p-4 space-y-4">
                                                        {(domain.standards || []).map((standard: any, stdIdx: number) => (
                                                            <div key={standard.id} className="rounded-lg border border-border/30 overflow-hidden">
                                                                {/* Standard Header */}
                                                                <div
                                                                    className="flex items-center gap-3 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
                                                                    onClick={() => toggleStandard(standard.id)}
                                                                >
                                                                    {expandedStandards.has(standard.id) ? (
                                                                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                                                    ) : (
                                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                                    )}
                                                                    <Badge variant="outline" className="font-mono text-xs">S{stdIdx + 1}</Badge>
                                                                    {isEditMode ? (
                                                                        <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                                                                            <Input
                                                                                value={standard.name}
                                                                                onChange={(e) => handleUpdateStandard(standard.id, { name: e.target.value })}
                                                                                className="flex-1 text-sm h-7 px-2"
                                                                            />
                                                                            <Button
                                                                                variant="ghost"
                                                                                size="icon"
                                                                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                                onClick={() => handleDeleteStandard(standard.id, domain.id)}
                                                                            >
                                                                                <Trash2 className="h-3.5 w-3.5" />
                                                                            </Button>
                                                                        </div>
                                                                    ) : (
                                                                        <span className="text-sm font-medium flex-1">{standard.name}</span>
                                                                    )}
                                                                    <span className="text-xs text-muted-foreground">{standard.kpis?.length || 0} KPIs</span>
                                                                </div>

                                                                {/* Standard Content (KPIs) */}
                                                                {expandedStandards.has(standard.id) && (
                                                                    <div className="p-3 space-y-3">
                                                                        {(standard.kpis || []).map((kpi: any, kpiIdx: number) => (
                                                                            <div key={kpi.id} className="p-3 rounded-lg bg-background border border-border/30 hover:border-primary/30 transition-colors">
                                                                                <div className="flex items-start gap-3">
                                                                                    <div className="w-7 h-7 rounded-md bg-primary/10 flex items-center justify-center text-xs font-mono font-bold text-primary">
                                                                                        {kpiIdx + 1}
                                                                                    </div>
                                                                                    <div className="flex-1 space-y-2">
                                                                                        {isEditMode ? (
                                                                                            <>
                                                                                                <div className="flex items-center gap-2">
                                                                                                    <Input
                                                                                                        value={kpi.name}
                                                                                                        onChange={(e) => handleUpdateKPI(kpi.id, { name: e.target.value })}
                                                                                                        className="font-semibold text-sm h-7 px-2"
                                                                                                        placeholder="KPI Name"
                                                                                                    />
                                                                                                    <Button
                                                                                                        variant="ghost"
                                                                                                        size="icon"
                                                                                                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                                                                                        onClick={() => handleDeleteKPI(kpi.id, standard.id)}
                                                                                                    >
                                                                                                        <Trash2 className="h-3.5 w-3.5" />
                                                                                                    </Button>
                                                                                                </div>
                                                                                                <Textarea
                                                                                                    value={kpi.description || ''}
                                                                                                    onChange={(e) => handleUpdateKPI(kpi.id, { description: e.target.value })}
                                                                                                    placeholder="KPI Description / Measurement"
                                                                                                    className="text-xs min-h-[50px]"
                                                                                                />
                                                                                                <div className="grid grid-cols-4 gap-2">
                                                                                                    <div>
                                                                                                        <label className="text-xs text-muted-foreground block mb-1">4 - Exemplary</label>
                                                                                                        <Input
                                                                                                            value={kpi.rubric_4 || ''}
                                                                                                            onChange={(e) => handleUpdateKPI(kpi.id, { rubric_4: e.target.value })}
                                                                                                            className="text-xs h-7 px-2"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-xs text-muted-foreground block mb-1">3 - Proficient</label>
                                                                                                        <Input
                                                                                                            value={kpi.rubric_3 || ''}
                                                                                                            onChange={(e) => handleUpdateKPI(kpi.id, { rubric_3: e.target.value })}
                                                                                                            className="text-xs h-7 px-2"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-xs text-muted-foreground block mb-1">2 - Developing</label>
                                                                                                        <Input
                                                                                                            value={kpi.rubric_2 || ''}
                                                                                                            onChange={(e) => handleUpdateKPI(kpi.id, { rubric_2: e.target.value })}
                                                                                                            className="text-xs h-7 px-2"
                                                                                                        />
                                                                                                    </div>
                                                                                                    <div>
                                                                                                        <label className="text-xs text-muted-foreground block mb-1">1 - Beginning</label>
                                                                                                        <Input
                                                                                                            value={kpi.rubric_1 || ''}
                                                                                                            onChange={(e) => handleUpdateKPI(kpi.id, { rubric_1: e.target.value })}
                                                                                                            className="text-xs h-7 px-2"
                                                                                                        />
                                                                                                    </div>
                                                                                                </div>
                                                                                                <div className="flex items-start gap-2 p-2 rounded bg-muted/30">
                                                                                                    <Info className="h-3.5 w-3.5 text-primary mt-1" />
                                                                                                    <Input
                                                                                                        value={kpi.evidence_guidance || ''}
                                                                                                        onChange={(e) => handleUpdateKPI(kpi.id, { evidence_guidance: e.target.value })}
                                                                                                        placeholder="Evidence guidance..."
                                                                                                        className="bg-transparent border-none text-xs h-6 p-0 focus-visible:ring-0"
                                                                                                    />
                                                                                                </div>
                                                                                            </>
                                                                                        ) : (
                                                                                            <>
                                                                                                <h5 className="font-semibold text-sm">{kpi.name}</h5>
                                                                                                {kpi.description && (
                                                                                                    <p className="text-xs text-muted-foreground">{kpi.description}</p>
                                                                                                )}
                                                                                                <div className="flex flex-wrap gap-1.5 mt-2">
                                                                                                    <Badge variant="default" className="text-xs py-0 px-1.5">4-Exemplary: {kpi.rubric_4}</Badge>
                                                                                                    <Badge variant="secondary" className="text-xs py-0 px-1.5">3-Proficient: {kpi.rubric_3}</Badge>
                                                                                                    <Badge variant="outline" className="text-xs py-0 px-1.5">2-Developing: {kpi.rubric_2}</Badge>
                                                                                                    <Badge variant="outline" className="text-xs py-0 px-1.5 text-muted-foreground">1-Beginning: {kpi.rubric_1}</Badge>
                                                                                                </div>
                                                                                                {kpi.evidence_guidance && (
                                                                                                    <div className="mt-2 flex items-start gap-1.5 p-1.5 rounded bg-muted/30">
                                                                                                        <Info className="h-3 w-3 text-primary mt-0.5" />
                                                                                                        <p className="text-xs text-muted-foreground">{kpi.evidence_guidance}</p>
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
                                                                                size="sm"
                                                                                className="w-full border-dashed"
                                                                                onClick={() => handleAddKPI(standard.id)}
                                                                            >
                                                                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                                                Add KPI
                                                                            </Button>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                        {isEditMode && (
                                                            <Button
                                                                variant="outline"
                                                                size="sm"
                                                                className="w-full border-dashed"
                                                                onClick={() => handleAddStandard(domain.id)}
                                                            >
                                                                <Plus className="h-3.5 w-3.5 mr-1.5" />
                                                                Add Standard
                                                            </Button>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {isEditMode && (
                                            <Button
                                                className="w-full py-6 border-dashed border-2 rounded-xl"
                                                variant="outline"
                                                onClick={handleAddDomain}
                                            >
                                                <Plus className="h-5 w-5 mr-2" />
                                                Add New Domain
                                            </Button>
                                        )}
                                        {(!currentData.domains || currentData.domains.length === 0) && !isEditMode && (
                                            <div className="text-center py-12 text-muted-foreground">
                                                <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-30" />
                                                <p>No domains defined yet.</p>
                                                <p className="text-sm">Click "Edit" to add domains, standards, and KPIs.</p>
                                            </div>
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
                                Click on a rubric template to view its KPI framework.
                            </p>
                        </Card>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                <AlertDialogContent className="glass-panel-strong border-destructive/20">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
                            <Trash2 className="h-5 w-5" />
                            Rubric Deletion - Danger Zone
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-4 pt-2" asChild>
                            <div>
                                <span className="font-bold text-foreground block">
                                    Are you absolutely sure you want to delete the "{selectedTemplate?.name}" rubric?
                                </span>
                                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs text-destructive-foreground space-y-2">
                                    <p>• This will permanently remove all associated Domains, Standards, and KPIs.</p>
                                    <p>• This action <strong>cannot be undone</strong>.</p>
                                    <p>• If this rubric is linked to active or historical assessments, deletion may be blocked by the system.</p>
                                </div>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="glass-panel">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteRubric}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete Rubric Permanently
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
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
