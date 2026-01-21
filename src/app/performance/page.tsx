'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Collapsible,
    CollapsibleContent,
    CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Target,
    ChevronRight,
    ChevronDown,
    Plus,
    FileText,
    Link as LinkIcon,
    Upload,
    Trash2,
    Calendar,
    CheckCircle2,
    Loader2,
    ExternalLink,
    X,
    MoreHorizontal,
    GripVertical,
    LayoutGrid,
    List,
    Layers,
    Clock,
    AlertCircle,
    CheckSquare,
    Square,
    ArrowRight,
} from 'lucide-react';
import { format } from 'date-fns';

// Types
interface KPI {
    id: string;
    name: string;
    description: string;
    rubric_1: string;
    rubric_2: string;
    rubric_3: string;
    rubric_4: string;
}

interface Standard {
    id: string;
    name: string;
    kpis: KPI[];
}

interface Domain {
    id: string;
    name: string;
    standards: Standard[];
}

interface Template {
    id: string;
    name: string;
    domains: Domain[];
}

interface Subtask {
    id: string;
    title: string;
    is_completed: boolean;
    sort_order: number;
}

interface TaskKPI {
    id: string;
    kpi_id: string;
    kpi_name: string;
    domain_name: string;
    standard_name: string;
    claimed_score: number | null;
    evidence_notes: string | null;
}

interface Artifact {
    id: string;
    artifact_type: 'file' | 'link';
    file_name?: string;
    file_url?: string;
    file_type?: string;
    link_url?: string;
    link_title?: string;
}

interface KpiName {
    kpi_id: string;
    kpi_name: string;
    domain_name: string;
}

interface WorkTask {
    id: string;
    title: string;
    description: string | null;
    status: 'planned' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    progress: number;
    due_date: string | null;
    completed_at: string | null;
    sort_order: number;
    template_name: string | null;
    subtask_count: number;
    completed_subtask_count: number;
    kpi_count: number;
    artifact_count: number;
    kpi_names?: KpiName[];
    subtasks?: Subtask[];
    kpis?: TaskKPI[];
    artifacts?: Artifact[];
}

interface Stats {
    total_tasks: number;
    planned_count: number;
    in_progress_count: number;
    completed_count: number;
    total_kpi_links: number;
}

// Period options
function generatePeriodOptions(): string[] {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const periods: string[] = [];
    const academicYear = month >= 7 ? `${year}-${year + 1}` : `${year - 1}-${year}`;
    const currentSemester = month >= 1 && month <= 6 ? 'Semester 2' : 'Semester 1';
    periods.push(`${academicYear} ${currentSemester}`);
    periods.push(`${academicYear} ${currentSemester === 'Semester 1' ? 'Semester 2' : 'Semester 1'}`);
    const prevYear = month >= 7 ? `${year - 1}-${year}` : `${year - 2}-${year - 1}`;
    periods.push(`${prevYear} Semester 2`);
    periods.push(`${prevYear} Semester 1`);
    return periods;
}

// Priority colors
const priorityColors: Record<string, string> = {
    low: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
    medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
    high: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
    urgent: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
};

// Status columns configuration
const statusColumns = [
    { key: 'planned', label: 'Planned', icon: Clock, color: 'text-slate-500' },
    { key: 'in_progress', label: 'In Progress', icon: ArrowRight, color: 'text-blue-500' },
    { key: 'completed', label: 'Completed', icon: CheckCircle2, color: 'text-green-500' },
] as const;

// ============================================================================
// TASK CARD COMPONENT
// ============================================================================
function TaskCard({
    task,
    onEdit,
    onStatusChange,
    onDelete,
    isDragging
}: {
    task: WorkTask;
    onEdit: () => void;
    onStatusChange: (status: 'planned' | 'in_progress' | 'completed') => void;
    onDelete: () => void;
    isDragging?: boolean;
}) {
    const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'completed';

    return (
        <Card
            className={`cursor-pointer hover:shadow-md transition-all ${isDragging ? 'opacity-50 rotate-2' : ''}`}
            onClick={onEdit}
        >
            <CardContent className="p-4 space-y-3">
                {/* Header */}
                <div className="flex items-start justify-between gap-2">
                    <h3 className="font-medium text-sm line-clamp-2">{task.title}</h3>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0">
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {statusColumns.filter(s => s.key !== task.status).map(s => (
                                <DropdownMenuItem
                                    key={s.key}
                                    onClick={(e) => { e.stopPropagation(); onStatusChange(s.key); }}
                                >
                                    <s.icon className={`h-4 w-4 mr-2 ${s.color}`} />
                                    Move to {s.label}
                                </DropdownMenuItem>
                            ))}
                            <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => { e.stopPropagation(); onDelete(); }}
                            >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Badges row */}
                <div className="flex flex-wrap gap-1">
                    <Badge variant="outline" className={priorityColors[task.priority]}>
                        {task.priority}
                    </Badge>
                    {task.artifact_count > 0 && (
                        <Badge variant="secondary" className="gap-1">
                            <FileText className="h-3 w-3" />
                            {task.artifact_count}
                        </Badge>
                    )}
                </div>

                {/* Linked KPIs */}
                {task.kpi_names && task.kpi_names.length > 0 && (
                    <div className="space-y-1">
                        {task.kpi_names.slice(0, 2).map((kpi, idx) => (
                            <div key={idx} className="flex items-start gap-1.5 text-xs">
                                <Target className="h-3 w-3 text-primary shrink-0 mt-0.5" />
                                <span className="text-muted-foreground line-clamp-1">{kpi.kpi_name}</span>
                            </div>
                        ))}
                        {task.kpi_names.length > 2 && (
                            <p className="text-xs text-muted-foreground pl-4">
                                +{task.kpi_names.length - 2} more KPIs
                            </p>
                        )}
                    </div>
                )}

                {/* Progress */}
                {task.subtask_count > 0 && (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                                <CheckSquare className="h-3 w-3" />
                                {task.completed_subtask_count}/{task.subtask_count}
                            </span>
                            <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-1" />
                    </div>
                )}

                {/* Due date */}
                {task.due_date && (
                    <div className={`flex items-center gap-1 text-xs ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                        {isOverdue && <AlertCircle className="h-3 w-3" />}
                        <Calendar className="h-3 w-3" />
                        {format(new Date(task.due_date), 'MMM d, yyyy')}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}

// ============================================================================
// KANBAN COLUMN COMPONENT
// ============================================================================
function KanbanColumn({
    status,
    tasks,
    onAddTask,
    onEditTask,
    onStatusChange,
    onDeleteTask,
}: {
    status: typeof statusColumns[number];
    tasks: WorkTask[];
    onAddTask: () => void;
    onEditTask: (task: WorkTask) => void;
    onStatusChange: (taskId: string, status: 'planned' | 'in_progress' | 'completed') => void;
    onDeleteTask: (taskId: string) => void;
}) {
    return (
        <div className="flex-1 min-w-[300px] max-w-[400px]">
            <div className="flex items-center justify-between mb-3 px-1">
                <div className="flex items-center gap-2">
                    <status.icon className={`h-4 w-4 ${status.color}`} />
                    <span className="font-medium">{status.label}</span>
                    <Badge variant="secondary" className="rounded-full">
                        {tasks.length}
                    </Badge>
                </div>
                {status.key === 'planned' && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onAddTask}>
                        <Plus className="h-4 w-4" />
                    </Button>
                )}
            </div>
            <div className="space-y-2 min-h-[200px] p-2 rounded-lg bg-muted/30">
                {tasks.map(task => (
                    <TaskCard
                        key={task.id}
                        task={task}
                        onEdit={() => onEditTask(task)}
                        onStatusChange={(s) => onStatusChange(task.id, s)}
                        onDelete={() => onDeleteTask(task.id)}
                    />
                ))}
                {tasks.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-8">
                        No tasks
                    </p>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function WorkLogContent() {
    const [templates, setTemplates] = useState<Template[]>([]);
    const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<string>(generatePeriodOptions()[0]);
    const [tasks, setTasks] = useState<WorkTask[]>([]);
    const [stats, setStats] = useState<Stats | null>(null);
    const [kpiTasksMap, setKpiTasksMap] = useState<Record<string, string[]>>({});
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'kpi'>('kanban');

    // Task modal state
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<WorkTask | null>(null);
    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        status: 'planned' as const,
        priority: 'medium' as const,
        due_date: '',
    });
    const [taskSubtasks, setTaskSubtasks] = useState<Subtask[]>([]);
    const [taskKPIs, setTaskKPIs] = useState<TaskKPI[]>([]);
    const [taskArtifacts, setTaskArtifacts] = useState<Artifact[]>([]);
    const [newSubtask, setNewSubtask] = useState('');
    const [newLinkUrl, setNewLinkUrl] = useState('');
    const [newLinkTitle, setNewLinkTitle] = useState('');
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);

    // KPI selector state
    const [kpiSelectorOpen, setKpiSelectorOpen] = useState(false);
    const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set());
    const [expandedStandards, setExpandedStandards] = useState<Set<string>>(new Set());

    const periodOptions = useMemo(() => generatePeriodOptions(), []);

    // Fetch templates on mount
    useEffect(() => {
        fetchTemplates();
    }, []);

    // Fetch tasks when template/period changes
    const fetchTasks = useCallback(async () => {
        if (!selectedTemplate) return;
        try {
            const res = await fetch(
                `/api/work-tasks?period=${encodeURIComponent(selectedPeriod)}&templateId=${selectedTemplate.id}`
            );
            if (res.ok) {
                const { data, stats: statsData, kpiTasksMap: kpiMap } = await res.json();
                setTasks(data || []);
                setStats(statsData || null);
                setKpiTasksMap(kpiMap || {});
            }
        } catch (error) {
            console.error('Failed to fetch tasks:', error);
        }
    }, [selectedTemplate, selectedPeriod]);

    useEffect(() => {
        if (selectedTemplate && selectedPeriod) {
            fetchTasks();
        }
    }, [selectedTemplate, selectedPeriod, fetchTasks]);

    async function fetchTemplates() {
        try {
            const res = await fetch('/api/rubrics');
            if (res.ok) {
                const { data } = await res.json();
                setTemplates(data || []);
                if (data && data.length > 0) {
                    const detailRes = await fetch(`/api/rubrics?id=${data[0].id}`);
                    if (detailRes.ok) {
                        const { data: detail } = await detailRes.json();
                        setSelectedTemplate(detail);
                    }
                }
            }
        } catch (error) {
            console.error('Failed to fetch templates:', error);
        } finally {
            setLoading(false);
        }
    }

    async function handleSelectTemplate(templateId: string) {
        setLoading(true);
        try {
            const res = await fetch(`/api/rubrics?id=${templateId}`);
            if (res.ok) {
                const { data } = await res.json();
                setSelectedTemplate(data);
            }
        } catch (error) {
            console.error('Failed to fetch template:', error);
        } finally {
            setLoading(false);
        }
    }

    // Task modal handlers
    function openTaskModal(task?: WorkTask) {
        setEditingTask(task || null);
        setTaskForm({
            title: task?.title || '',
            description: task?.description || '',
            status: task?.status || 'planned',
            priority: task?.priority || 'medium',
            due_date: task?.due_date || '',
        });
        setTaskSubtasks([]);
        setTaskKPIs([]);
        setTaskArtifacts([]);
        setNewSubtask('');
        setNewLinkUrl('');
        setNewLinkTitle('');
        setTaskModalOpen(true);

        if (task) {
            fetchTaskDetails(task.id);
        }
    }

    async function fetchTaskDetails(taskId: string) {
        try {
            const res = await fetch(`/api/work-tasks?id=${taskId}`);
            if (res.ok) {
                const { data } = await res.json();
                setTaskSubtasks(data.subtasks || []);
                setTaskKPIs(data.kpis || []);
                setTaskArtifacts(data.artifacts || []);
            }
        } catch (error) {
            console.error('Failed to fetch task details:', error);
        }
    }

    async function handleSaveTask() {
        if (!selectedTemplate || !taskForm.title.trim()) return;
        setSaving(true);

        try {
            if (editingTask) {
                // Update
                await fetch('/api/work-tasks', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ id: editingTask.id, ...taskForm }),
                });
            } else {
                // Create
                await fetch('/api/work-tasks', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...taskForm,
                        template_id: selectedTemplate.id,
                        period: selectedPeriod,
                    }),
                });
            }

            setTaskModalOpen(false);
            fetchTasks();
        } catch (error) {
            console.error('Save task error:', error);
        } finally {
            setSaving(false);
        }
    }

    async function handleStatusChange(taskId: string, status: 'planned' | 'in_progress' | 'completed') {
        try {
            await fetch('/api/work-tasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: taskId, status }),
            });
            fetchTasks();
        } catch (error) {
            console.error('Status change error:', error);
        }
    }

    async function handleDeleteTask(taskId: string) {
        if (!confirm('Delete this task and all its subtasks?')) return;
        try {
            await fetch(`/api/work-tasks?id=${taskId}`, { method: 'DELETE' });
            fetchTasks();
        } catch (error) {
            console.error('Delete task error:', error);
        }
    }

    // Subtask handlers
    async function handleAddSubtask() {
        if (!editingTask || !newSubtask.trim()) return;
        try {
            const res = await fetch('/api/work-tasks/subtasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: editingTask.id, title: newSubtask }),
            });
            if (res.ok) {
                const { data } = await res.json();
                setTaskSubtasks(prev => [...prev, data]);
                setNewSubtask('');
            }
        } catch (error) {
            console.error('Add subtask error:', error);
        }
    }

    async function handleToggleSubtask(subtaskId: string, isCompleted: boolean) {
        try {
            await fetch('/api/work-tasks/subtasks', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: subtaskId, is_completed: isCompleted }),
            });
            setTaskSubtasks(prev =>
                prev.map(s => s.id === subtaskId ? { ...s, is_completed: isCompleted } : s)
            );
        } catch (error) {
            console.error('Toggle subtask error:', error);
        }
    }

    async function handleDeleteSubtask(subtaskId: string) {
        try {
            await fetch(`/api/work-tasks/subtasks?id=${subtaskId}`, { method: 'DELETE' });
            setTaskSubtasks(prev => prev.filter(s => s.id !== subtaskId));
        } catch (error) {
            console.error('Delete subtask error:', error);
        }
    }

    // KPI handlers
    async function handleLinkKPI(kpiId: string) {
        if (!editingTask) return;
        try {
            const res = await fetch('/api/work-tasks/kpis', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task_id: editingTask.id, kpi_id: kpiId }),
            });
            if (res.ok) {
                fetchTaskDetails(editingTask.id);
                setKpiSelectorOpen(false);
            }
        } catch (error) {
            console.error('Link KPI error:', error);
        }
    }

    async function handleUnlinkKPI(linkId: string) {
        try {
            await fetch(`/api/work-tasks/kpis?id=${linkId}`, { method: 'DELETE' });
            setTaskKPIs(prev => prev.filter(k => k.id !== linkId));
        } catch (error) {
            console.error('Unlink KPI error:', error);
        }
    }

    // Artifact handlers
    async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
        if (!e.target.files?.[0] || !editingTask) return;
        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('file', e.target.files[0]);
            formData.append('task_id', editingTask.id);

            const res = await fetch('/api/work-tasks/artifacts', {
                method: 'POST',
                body: formData,
            });

            if (res.ok) {
                const { data } = await res.json();
                setTaskArtifacts(prev => [data, ...prev]);
            }
        } catch (error) {
            console.error('Upload error:', error);
        } finally {
            setUploading(false);
            e.target.value = '';
        }
    }

    async function handleAddLink() {
        if (!newLinkUrl || !editingTask) return;
        try {
            const res = await fetch('/api/work-tasks/artifacts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    task_id: editingTask.id,
                    link_url: newLinkUrl,
                    link_title: newLinkTitle || null,
                }),
            });
            if (res.ok) {
                const { data } = await res.json();
                setTaskArtifacts(prev => [data, ...prev]);
                setNewLinkUrl('');
                setNewLinkTitle('');
            }
        } catch (error) {
            console.error('Add link error:', error);
        }
    }

    async function handleDeleteArtifact(artifactId: string) {
        try {
            await fetch(`/api/work-tasks/artifacts?id=${artifactId}`, { method: 'DELETE' });
            setTaskArtifacts(prev => prev.filter(a => a.id !== artifactId));
        } catch (error) {
            console.error('Delete artifact error:', error);
        }
    }

    // Group tasks by status for Kanban
    const tasksByStatus = useMemo(() => {
        const grouped: Record<string, WorkTask[]> = {
            planned: [],
            in_progress: [],
            completed: [],
        };
        tasks.forEach(task => {
            if (grouped[task.status]) {
                grouped[task.status].push(task);
            }
        });
        return grouped;
    }, [tasks]);

    // Group tasks by KPI for KPI view
    const tasksByKPI = useMemo(() => {
        const kpiTasks: Record<string, { kpi: KPI; domain: Domain; standard: Standard; taskIds: string[] }> = {};

        if (!selectedTemplate?.domains) return kpiTasks;

        // Initialize all KPIs
        selectedTemplate.domains.forEach(domain => {
            domain.standards.forEach(standard => {
                standard.kpis.forEach(kpi => {
                    kpiTasks[kpi.id] = {
                        kpi,
                        domain,
                        standard,
                        taskIds: kpiTasksMap[kpi.id] || []
                    };
                });
            });
        });

        return kpiTasks;
    }, [selectedTemplate, kpiTasksMap]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Work Log Dashboard</h1>
                    <p className="text-muted-foreground">Track your tasks and link them to KPIs</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                        <SelectTrigger className="w-[180px]">
                            <Calendar className="h-4 w-4 mr-2" />
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {periodOptions.map(p => (
                                <SelectItem key={p} value={p}>{p}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select
                        value={selectedTemplate?.id || ''}
                        onValueChange={handleSelectTemplate}
                    >
                        <SelectTrigger className="w-[180px]">
                            <Target className="h-4 w-4 mr-2" />
                            <SelectValue placeholder="Framework" />
                        </SelectTrigger>
                        <SelectContent>
                            {templates.map(t => (
                                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Button onClick={() => openTaskModal()}>
                        <Plus className="h-4 w-4 mr-2" />
                        New Task
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid gap-4 md:grid-cols-4">
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Total Tasks</CardDescription>
                        <CardTitle className="text-3xl">{stats?.total_tasks || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>In Progress</CardDescription>
                        <CardTitle className="text-3xl text-blue-500">{stats?.in_progress_count || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>Completed</CardDescription>
                        <CardTitle className="text-3xl text-green-500">{stats?.completed_count || 0}</CardTitle>
                    </CardHeader>
                </Card>
                <Card>
                    <CardHeader className="pb-2">
                        <CardDescription>KPI Links</CardDescription>
                        <CardTitle className="text-3xl">{stats?.total_kpi_links || 0}</CardTitle>
                    </CardHeader>
                </Card>
            </div>

            {/* View Tabs */}
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
                <TabsList>
                    <TabsTrigger value="kanban" className="gap-2">
                        <LayoutGrid className="h-4 w-4" />
                        Kanban
                    </TabsTrigger>
                    <TabsTrigger value="list" className="gap-2">
                        <List className="h-4 w-4" />
                        List
                    </TabsTrigger>
                    <TabsTrigger value="kpi" className="gap-2">
                        <Layers className="h-4 w-4" />
                        By KPI
                    </TabsTrigger>
                </TabsList>

                {/* Kanban View */}
                <TabsContent value="kanban" className="mt-4">
                    <div className="flex gap-4 overflow-x-auto pb-4">
                        {statusColumns.map(status => (
                            <KanbanColumn
                                key={status.key}
                                status={status}
                                tasks={tasksByStatus[status.key] || []}
                                onAddTask={() => openTaskModal()}
                                onEditTask={(task) => openTaskModal(task)}
                                onStatusChange={handleStatusChange}
                                onDeleteTask={handleDeleteTask}
                            />
                        ))}
                    </div>
                </TabsContent>

                {/* List View */}
                <TabsContent value="list" className="mt-4">
                    <Card>
                        <CardContent className="p-0">
                            <div className="divide-y">
                                {tasks.map(task => (
                                    <div
                                        key={task.id}
                                        className="flex items-center gap-4 p-4 hover:bg-muted/50 cursor-pointer"
                                        onClick={() => openTaskModal(task)}
                                    >
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-medium truncate">{task.title}</h3>
                                                <Badge variant="outline" className={priorityColors[task.priority]}>
                                                    {task.priority}
                                                </Badge>
                                            </div>
                                            {task.description && (
                                                <p className="text-sm text-muted-foreground truncate mt-1">
                                                    {task.description}
                                                </p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 shrink-0">
                                            {task.subtask_count > 0 && (
                                                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                                                    <CheckSquare className="h-4 w-4" />
                                                    {task.completed_subtask_count}/{task.subtask_count}
                                                </div>
                                            )}
                                            {task.kpi_count > 0 && (
                                                <Badge variant="secondary">
                                                    <Target className="h-3 w-3 mr-1" />
                                                    {task.kpi_count} KPIs
                                                </Badge>
                                            )}
                                            <Badge
                                                variant="outline"
                                                className={
                                                    task.status === 'completed' ? 'text-green-500' :
                                                        task.status === 'in_progress' ? 'text-blue-500' : ''
                                                }
                                            >
                                                {task.status.replace('_', ' ')}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                                {tasks.length === 0 && (
                                    <div className="p-8 text-center text-muted-foreground">
                                        No tasks yet. Create your first task!
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* KPI View */}
                <TabsContent value="kpi" className="mt-4">
                    <Card>
                        <CardContent className="p-4">
                            {selectedTemplate?.domains?.map(domain => (
                                <Collapsible
                                    key={domain.id}
                                    open={expandedDomains.has(domain.id)}
                                    onOpenChange={(open) => {
                                        const next = new Set(expandedDomains);
                                        if (open) next.add(domain.id);
                                        else next.delete(domain.id);
                                        setExpandedDomains(next);
                                    }}
                                >
                                    <CollapsibleTrigger asChild>
                                        <Button variant="ghost" className="w-full justify-start gap-2 h-auto py-3">
                                            {expandedDomains.has(domain.id) ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                            <span className="font-semibold">{domain.name}</span>
                                        </Button>
                                    </CollapsibleTrigger>
                                    <CollapsibleContent className="pl-6">
                                        {domain.standards.map(standard => (
                                            <Collapsible
                                                key={standard.id}
                                                open={expandedStandards.has(standard.id)}
                                                onOpenChange={(open) => {
                                                    const next = new Set(expandedStandards);
                                                    if (open) next.add(standard.id);
                                                    else next.delete(standard.id);
                                                    setExpandedStandards(next);
                                                }}
                                            >
                                                <CollapsibleTrigger asChild>
                                                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                                                        {expandedStandards.has(standard.id) ? (
                                                            <ChevronDown className="h-3 w-3" />
                                                        ) : (
                                                            <ChevronRight className="h-3 w-3" />
                                                        )}
                                                        {standard.name}
                                                    </Button>
                                                </CollapsibleTrigger>
                                                <CollapsibleContent className="pl-6 space-y-2 py-2">
                                                    {standard.kpis.map(kpi => {
                                                        const taskCount = kpiTasksMap[kpi.id]?.length || 0;
                                                        const linkedTaskIds = kpiTasksMap[kpi.id] || [];
                                                        const linkedTasks = tasks.filter(t => linkedTaskIds.includes(t.id));
                                                        return (
                                                            <div key={kpi.id} className="border rounded-lg p-3 bg-muted/30">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex-1">
                                                                        <p className="font-medium text-sm">{kpi.name}</p>
                                                                        {kpi.description && (
                                                                            <p className="text-xs text-muted-foreground">{kpi.description}</p>
                                                                        )}
                                                                    </div>
                                                                    <Badge variant={taskCount > 0 ? "default" : "outline"} className={taskCount > 0 ? "bg-primary" : ""}>
                                                                        {taskCount} {taskCount === 1 ? 'task' : 'tasks'}
                                                                    </Badge>
                                                                </div>
                                                                {linkedTasks.length > 0 && (
                                                                    <div className="mt-2 space-y-1">
                                                                        {linkedTasks.map(task => (
                                                                            <div
                                                                                key={task.id}
                                                                                className="flex items-center gap-2 text-xs p-2 bg-background rounded cursor-pointer hover:bg-accent"
                                                                                onClick={() => openTaskModal(task)}
                                                                            >
                                                                                <Badge variant="outline" className="shrink-0 text-[10px]">
                                                                                    {task.status.replace('_', ' ')}
                                                                                </Badge>
                                                                                <span className="truncate">{task.title}</span>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </CollapsibleContent>
                                            </Collapsible>
                                        ))}
                                    </CollapsibleContent>
                                </Collapsible>
                            ))}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Task Modal */}
            <Dialog open={taskModalOpen} onOpenChange={setTaskModalOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingTask ? 'Edit Task' : 'New Task'}</DialogTitle>
                        <DialogDescription>
                            {editingTask ? 'Update task details' : 'Create a new task to track your work'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Title */}
                        <div className="space-y-2">
                            <Label>Title *</Label>
                            <Input
                                value={taskForm.title}
                                onChange={(e) => setTaskForm(f => ({ ...f, title: e.target.value }))}
                                placeholder="Task title..."
                            />
                        </div>

                        {/* Description */}
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea
                                value={taskForm.description}
                                onChange={(e) => setTaskForm(f => ({ ...f, description: e.target.value }))}
                                placeholder="Describe this task..."
                                rows={3}
                            />
                        </div>

                        {/* Status & Priority */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Status</Label>
                                <Select
                                    value={taskForm.status}
                                    onValueChange={(v) => setTaskForm(f => ({ ...f, status: v as typeof f.status }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="planned">Planned</SelectItem>
                                        <SelectItem value="in_progress">In Progress</SelectItem>
                                        <SelectItem value="completed">Completed</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <Label>Priority</Label>
                                <Select
                                    value={taskForm.priority}
                                    onValueChange={(v) => setTaskForm(f => ({ ...f, priority: v as typeof f.priority }))}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="low">Low</SelectItem>
                                        <SelectItem value="medium">Medium</SelectItem>
                                        <SelectItem value="high">High</SelectItem>
                                        <SelectItem value="urgent">Urgent</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Due Date */}
                        <div className="space-y-2">
                            <Label>Due Date</Label>
                            <Input
                                type="date"
                                value={taskForm.due_date}
                                onChange={(e) => setTaskForm(f => ({ ...f, due_date: e.target.value }))}
                            />
                        </div>

                        {/* Subtasks - Only for existing tasks */}
                        {editingTask && (
                            <div className="space-y-2 border-t pt-4">
                                <Label>Subtasks / Checklist</Label>
                                <div className="space-y-2">
                                    {taskSubtasks.map(subtask => (
                                        <div key={subtask.id} className="flex items-center gap-2 group">
                                            <Checkbox
                                                checked={subtask.is_completed}
                                                onCheckedChange={(checked) =>
                                                    handleToggleSubtask(subtask.id, checked as boolean)
                                                }
                                            />
                                            <span className={`flex-1 text-sm ${subtask.is_completed ? 'line-through text-muted-foreground' : ''}`}>
                                                {subtask.title}
                                            </span>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6 opacity-0 group-hover:opacity-100"
                                                onClick={() => handleDeleteSubtask(subtask.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                    <div className="flex gap-2">
                                        <Input
                                            value={newSubtask}
                                            onChange={(e) => setNewSubtask(e.target.value)}
                                            placeholder="Add subtask..."
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddSubtask()}
                                        />
                                        <Button variant="outline" size="sm" onClick={handleAddSubtask}>
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Linked KPIs - Only for existing tasks */}
                        {editingTask && (
                            <div className="space-y-2 border-t pt-4">
                                <div className="flex items-center justify-between">
                                    <Label>Linked KPIs</Label>
                                    <Button variant="outline" size="sm" onClick={() => setKpiSelectorOpen(true)}>
                                        <Plus className="h-4 w-4 mr-1" />
                                        Link KPI
                                    </Button>
                                </div>
                                <div className="space-y-2">
                                    {taskKPIs.map(kpi => (
                                        <div key={kpi.id} className="flex items-center justify-between p-2 border rounded">
                                            <div>
                                                <p className="text-sm font-medium">{kpi.kpi_name}</p>
                                                <p className="text-xs text-muted-foreground">{kpi.domain_name} → {kpi.standard_name}</p>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-6 w-6"
                                                onClick={() => handleUnlinkKPI(kpi.id)}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Artifacts - Only for existing tasks */}
                        {editingTask && (
                            <div className="space-y-3 border-t pt-4">
                                <Label>Attachments</Label>

                                {taskArtifacts.length > 0 && (
                                    <div className="grid grid-cols-2 gap-2">
                                        {taskArtifacts.map(artifact => (
                                            <div key={artifact.id} className="flex items-center gap-2 p-2 border rounded">
                                                {artifact.artifact_type === 'file' ? (
                                                    <FileText className="h-4 w-4 text-blue-500 shrink-0" />
                                                ) : (
                                                    <LinkIcon className="h-4 w-4 text-green-500 shrink-0" />
                                                )}
                                                <span className="flex-1 text-sm truncate">
                                                    {artifact.artifact_type === 'file'
                                                        ? artifact.file_name
                                                        : artifact.link_title || artifact.link_url}
                                                </span>
                                                <div className="flex gap-1">
                                                    {(artifact.link_url || artifact.file_url) && (
                                                        <a
                                                            href={artifact.link_url || artifact.file_url}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="text-blue-500 hover:text-blue-700"
                                                        >
                                                            <ExternalLink className="h-4 w-4" />
                                                        </a>
                                                    )}
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-6 w-6"
                                                        onClick={() => handleDeleteArtifact(artifact.id)}
                                                    >
                                                        <X className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <div className="flex gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        disabled={uploading}
                                        onClick={() => document.getElementById('task-file-upload')?.click()}
                                    >
                                        {uploading ? (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        ) : (
                                            <Upload className="h-4 w-4 mr-2" />
                                        )}
                                        Upload File
                                    </Button>
                                    <input
                                        id="task-file-upload"
                                        type="file"
                                        className="hidden"
                                        onChange={handleFileUpload}
                                    />
                                </div>

                                <div className="flex gap-2">
                                    <Input
                                        placeholder="URL"
                                        value={newLinkUrl}
                                        onChange={(e) => setNewLinkUrl(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Input
                                        placeholder="Title"
                                        value={newLinkTitle}
                                        onChange={(e) => setNewLinkTitle(e.target.value)}
                                        className="flex-1"
                                    />
                                    <Button variant="outline" size="sm" onClick={handleAddLink} disabled={!newLinkUrl}>
                                        <LinkIcon className="h-4 w-4 mr-1" />
                                        Add
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setTaskModalOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleSaveTask} disabled={saving || !taskForm.title.trim()}>
                            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            {editingTask ? 'Update' : 'Create'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* KPI Selector Modal */}
            <Dialog open={kpiSelectorOpen} onOpenChange={setKpiSelectorOpen}>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Link KPI to Task</DialogTitle>
                        <DialogDescription>Select a KPI to link to this task</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedTemplate?.domains?.map(domain => (
                            <Card key={domain.id} className="overflow-hidden">
                                {/* Domain Header */}
                                <CardHeader className="bg-primary/10 py-3 px-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-primary" />
                                        <CardTitle className="text-base font-bold text-primary">
                                            {domain.name}
                                        </CardTitle>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-0">
                                    {domain.standards.map((standard, stdIndex) => (
                                        <div key={standard.id} className={stdIndex > 0 ? 'border-t' : ''}>
                                            {/* Standard Header */}
                                            <div className="bg-muted/50 px-4 py-2 flex items-center gap-2">
                                                <ChevronRight className="h-3 w-3 text-muted-foreground" />
                                                <span className="text-sm font-semibold text-muted-foreground">
                                                    {standard.name}
                                                </span>
                                                <Badge variant="outline" className="ml-auto text-xs">
                                                    {standard.kpis.length} KPIs
                                                </Badge>
                                            </div>
                                            {/* KPI List */}
                                            <div className="divide-y">
                                                {standard.kpis.map(kpi => {
                                                    const isLinked = taskKPIs.some(tk => tk.kpi_id === kpi.id);
                                                    return (
                                                        <button
                                                            key={kpi.id}
                                                            className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${isLinked
                                                                ? 'bg-green-50 dark:bg-green-950/30 cursor-not-allowed'
                                                                : 'hover:bg-accent cursor-pointer'
                                                                }`}
                                                            onClick={() => !isLinked && handleLinkKPI(kpi.id)}
                                                            disabled={isLinked}
                                                        >
                                                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${isLinked
                                                                ? 'border-green-500 bg-green-500'
                                                                : 'border-muted-foreground/30'
                                                                }`}>
                                                                {isLinked && <CheckCircle2 className="h-3 w-3 text-white" />}
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className={`text-sm font-medium ${isLinked ? 'text-green-700 dark:text-green-400' : ''}`}>
                                                                    {kpi.name}
                                                                </p>
                                                                {kpi.description && (
                                                                    <p className="text-xs text-muted-foreground truncate">
                                                                        {kpi.description}
                                                                    </p>
                                                                )}
                                                            </div>
                                                            {isLinked && (
                                                                <Badge variant="secondary" className="shrink-0 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                                                                    Linked
                                                                </Badge>
                                                            )}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setKpiSelectorOpen(false)}>
                            Close
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default function PerformancePage() {
    return (
        <ProtectedRoute>
            <Header />
            <main className="container mx-auto px-4 py-8">
                <WorkLogContent />
            </main>
        </ProtectedRoute>
    );
}
