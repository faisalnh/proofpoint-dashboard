import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { IndicatorEditDialog, IndicatorFormData } from '@/components/rubrics/IndicatorEditDialog';
import { 
  FileText, 
  Plus,
  Pencil,
  Trash2,
  Globe,
  Building2,
  Loader2,
  GripVertical,
  Link
} from 'lucide-react';

interface Department {
  id: string;
  name: string;
}

interface RubricTemplate {
  id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  is_global: boolean;
  created_by: string | null;
  created_at: string;
}

interface RubricSection {
  id: string;
  template_id: string;
  name: string;
  weight: number;
  sort_order: number;
}

interface ScoreOption {
  score: number;
  label: string;
  enabled: boolean;
}

interface RubricIndicator {
  id: string;
  section_id: string;
  name: string;
  description: string | null;
  sort_order: number;
  evidence_guidance: string | null;
  score_options: ScoreOption[] | null;
}

export default function Rubrics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [templates, setTemplates] = useState<RubricTemplate[]>([]);
  const [sections, setSections] = useState<RubricSection[]>([]);
  const [indicators, setIndicators] = useState<RubricIndicator[]>([]);
  
  // New template form
  const [isCreating, setIsCreating] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    department_id: null as string | null,
    is_global: false
  });
  
  // Edit mode
  const [editingTemplate, setEditingTemplate] = useState<RubricTemplate | null>(null);
  
  // Section form
  const [newSection, setNewSection] = useState({ name: '', weight: 0, templateId: '' });
  
  // Indicator dialog state
  const [indicatorDialogOpen, setIndicatorDialogOpen] = useState(false);
  const [editingIndicator, setEditingIndicator] = useState<RubricIndicator | null>(null);
  const [editingSectionId, setEditingSectionId] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    
    const [deptsRes, templatesRes, sectionsRes, indicatorsRes] = await Promise.all([
      supabase.from('departments').select('id, name').order('name'),
      supabase.from('rubric_templates').select('*').order('name'),
      supabase.from('rubric_sections').select('*').order('sort_order'),
      supabase.from('rubric_indicators').select('*').order('sort_order')
    ]);
    
    if (deptsRes.data) setDepartments(deptsRes.data);
    if (templatesRes.data) setTemplates(templatesRes.data as RubricTemplate[]);
    if (sectionsRes.data) setSections(sectionsRes.data as RubricSection[]);
    if (indicatorsRes.data) {
      setIndicators(indicatorsRes.data.map(ind => ({
        ...ind,
        score_options: ind.score_options as unknown as ScoreOption[] | null
      })) as RubricIndicator[]);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateTemplate = async () => {
    if (!newTemplate.name.trim()) return;
    
    setIsCreating(true);
    const { error } = await supabase.from('rubric_templates').insert({
      name: newTemplate.name.trim(),
      description: newTemplate.description.trim() || null,
      department_id: newTemplate.department_id,
      is_global: newTemplate.is_global,
      created_by: user?.id
    });
    setIsCreating(false);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Rubric template created' });
      setNewTemplate({ name: '', description: '', department_id: null, is_global: false });
      fetchData();
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    const { error } = await supabase.from('rubric_templates').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Rubric template removed' });
      fetchData();
    }
  };

  const handleAddSection = async (templateId: string) => {
    if (!newSection.name.trim() || newSection.weight <= 0) return;
    
    const maxOrder = Math.max(0, ...sections.filter(s => s.template_id === templateId).map(s => s.sort_order));
    
    const { error } = await supabase.from('rubric_sections').insert({
      template_id: templateId,
      name: newSection.name.trim(),
      weight: newSection.weight,
      sort_order: maxOrder + 1
    });
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Added', description: 'Section added to rubric' });
      setNewSection({ name: '', weight: 0, templateId: '' });
      fetchData();
    }
  };

  const handleDeleteSection = async (id: string) => {
    const { error } = await supabase.from('rubric_sections').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchData();
    }
  };
  const openAddIndicator = (sectionId: string) => {
    setEditingIndicator(null);
    setEditingSectionId(sectionId);
    setIndicatorDialogOpen(true);
  };

  const openEditIndicator = (indicator: RubricIndicator) => {
    setEditingIndicator(indicator);
    setEditingSectionId(indicator.section_id);
    setIndicatorDialogOpen(true);
  };

  const handleSaveIndicator = async (data: IndicatorFormData) => {
    if (!editingSectionId && !editingIndicator) return;
    
    const sectionId = editingIndicator?.section_id || editingSectionId!;
    
    if (editingIndicator) {
      // Update existing
      const { error } = await supabase.from('rubric_indicators').update({
        name: data.name.trim(),
        description: data.description?.trim() || null,
        evidence_guidance: data.evidence_guidance?.trim() || null,
        score_options: JSON.parse(JSON.stringify(data.score_options))
      }).eq('id', editingIndicator.id);
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        throw error;
      }
      toast({ title: 'Updated', description: 'Indicator updated' });
    } else {
      // Create new
      const maxOrder = Math.max(0, ...indicators.filter(i => i.section_id === sectionId).map(i => i.sort_order));
      
      const { error } = await supabase.from('rubric_indicators').insert({
        section_id: sectionId,
        name: data.name.trim(),
        description: data.description?.trim() || null,
        evidence_guidance: data.evidence_guidance?.trim() || null,
        score_options: JSON.parse(JSON.stringify(data.score_options)),
        sort_order: maxOrder + 1
      });
      
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        throw error;
      }
      toast({ title: 'Added', description: 'Indicator added' });
    }
    
    fetchData();
  };

  const handleDeleteIndicator = async (id: string) => {
    const { error } = await supabase.from('rubric_indicators').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      fetchData();
    }
  };

  const getDepartmentName = (deptId: string | null): string => {
    if (!deptId) return 'All Departments';
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'Unknown';
  };

  const getTemplateSections = (templateId: string) => 
    sections.filter(s => s.template_id === templateId);

  const getSectionIndicators = (sectionId: string) => 
    indicators.filter(i => i.section_id === sectionId);

  const getTotalWeight = (templateId: string) => 
    getTemplateSections(templateId).reduce((sum, s) => sum + Number(s.weight), 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Rubric Templates</h1>
            <p className="text-muted-foreground">Create and manage evaluation criteria</p>
          </div>
          
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" /> New Template
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Rubric Template</DialogTitle>
                <DialogDescription>
                  Define a new evaluation rubric for your team
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Template Name</Label>
                  <Input
                    placeholder="e.g., Web Developer Rubric"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    placeholder="Brief description of this rubric..."
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  />
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Global Template</Label>
                    <p className="text-sm text-muted-foreground">Available to all departments</p>
                  </div>
                  <Switch
                    checked={newTemplate.is_global}
                    onCheckedChange={(checked) => setNewTemplate({ ...newTemplate, is_global: checked, department_id: checked ? null : newTemplate.department_id })}
                  />
                </div>
                
                {!newTemplate.is_global && (
                  <div className="space-y-2">
                    <Label>Department</Label>
                    <Select 
                      value={newTemplate.department_id || 'none'} 
                      onValueChange={(v) => setNewTemplate({ ...newTemplate, department_id: v === 'none' ? null : v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">All Departments</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
              
              <DialogFooter>
                <Button onClick={handleCreateTemplate} disabled={isCreating || !newTemplate.name.trim()}>
                  {isCreating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Create Template
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {templates.length === 0 ? (
          <Card className="border-border/50">
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No rubric templates yet</h3>
              <p className="text-muted-foreground mb-4">Create your first evaluation rubric to get started</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {templates.map(template => (
              <Card key={template.id} className="border-border/50">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-primary" />
                        {template.name}
                      </CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                      <div className="flex items-center gap-2 mt-2">
                        {template.is_global ? (
                          <Badge variant="secondary" className="gap-1">
                            <Globe className="h-3 w-3" /> Global
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Building2 className="h-3 w-3" /> {getDepartmentName(template.department_id)}
                          </Badge>
                        )}
                        <Badge 
                          variant={getTotalWeight(template.id) === 100 ? 'default' : 'destructive'}
                        >
                          Weight: {getTotalWeight(template.id)}%
                        </Badge>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteTemplate(template.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <Accordion type="multiple" className="w-full">
                    {getTemplateSections(template.id).map(section => (
                      <AccordionItem key={section.id} value={section.id}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3">
                            <GripVertical className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{section.name}</span>
                            <Badge variant="outline">{section.weight}%</Badge>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pl-8">
                          <div className="space-y-2">
                            {getSectionIndicators(section.id).map(indicator => (
                              <div 
                                key={indicator.id}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/50"
                              >
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{indicator.name}</p>
                                  {indicator.description && (
                                    <p className="text-xs text-muted-foreground">{indicator.description}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-1">
                                    {indicator.evidence_guidance && (
                                      <span className="inline-flex items-center gap-1 text-xs text-primary">
                                        <Link className="h-3 w-3" /> Evidence guide
                                      </span>
                                    )}
                                    {indicator.score_options && (
                                      <span className="text-xs text-muted-foreground">
                                        {indicator.score_options.filter(o => o.enabled).length} scores enabled
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => openEditIndicator(indicator)}
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon"
                                    onClick={() => handleDeleteIndicator(indicator.id)}
                                  >
                                    <Trash2 className="h-3 w-3 text-destructive" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            
                            {/* Add Indicator Button */}
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="w-full mt-2"
                              onClick={() => openAddIndicator(section.id)}
                            >
                              <Plus className="h-4 w-4 mr-1" /> Add Indicator
                            </Button>
                          </div>
                          
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="mt-3 text-destructive"
                            onClick={() => handleDeleteSection(section.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" /> Remove Section
                          </Button>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  
                  {/* Add Section */}
                  <div className="flex items-end gap-2 mt-4 p-3 rounded-lg bg-muted/30">
                    <div className="flex-1">
                      <Label className="text-xs">Section Name</Label>
                      <Input
                        placeholder="e.g., Technical Skills"
                        value={newSection.templateId === template.id ? newSection.name : ''}
                        onChange={(e) => setNewSection({ 
                          ...newSection, 
                          name: e.target.value,
                          templateId: template.id 
                        })}
                      />
                    </div>
                    <div className="w-24">
                      <Label className="text-xs">Weight %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        placeholder="25"
                        value={newSection.templateId === template.id ? newSection.weight || '' : ''}
                        onChange={(e) => setNewSection({ 
                          ...newSection, 
                          weight: Number(e.target.value),
                          templateId: template.id 
                        })}
                      />
                    </div>
                    <Button 
                      onClick={() => handleAddSection(template.id)}
                      disabled={newSection.templateId !== template.id || !newSection.name.trim() || newSection.weight <= 0}
                    >
                      <Plus className="h-4 w-4 mr-1" /> Add Section
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      
      {/* Indicator Edit Dialog */}
      <IndicatorEditDialog
        open={indicatorDialogOpen}
        onOpenChange={setIndicatorDialogOpen}
        indicator={editingIndicator ? {
          name: editingIndicator.name,
          description: editingIndicator.description,
          evidence_guidance: editingIndicator.evidence_guidance,
          score_options: editingIndicator.score_options || []
        } : null}
        onSave={handleSaveIndicator}
        mode={editingIndicator ? 'edit' : 'create'}
      />
    </div>
  );
}
