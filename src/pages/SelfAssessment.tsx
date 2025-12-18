import { useState, useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { AssessmentSection, WeightedScoreDisplay, SectionData, IndicatorData } from "@/components/assessment";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Send, Save, Calendar, Briefcase, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

// Dummy rubric for Web Developer role
const initialSections: SectionData[] = [
  {
    id: "technical",
    name: "Technical Competency",
    weight: 45,
    indicators: [
      {
        id: "code-quality",
        name: "Code Quality & Standards",
        description: "Writes clean, maintainable, and well-documented code following established patterns",
        score: null,
        evidence: ""
      },
      {
        id: "problem-solving",
        name: "Problem Solving",
        description: "Demonstrates analytical thinking and innovative solutions to complex technical challenges",
        score: null,
        evidence: ""
      },
      {
        id: "technical-knowledge",
        name: "Technical Knowledge",
        description: "Maintains up-to-date expertise in relevant technologies and frameworks",
        score: null,
        evidence: ""
      }
    ]
  },
  {
    id: "delivery",
    name: "Project Delivery",
    weight: 30,
    indicators: [
      {
        id: "deadlines",
        name: "Meeting Deadlines",
        description: "Consistently delivers work on time while maintaining quality standards",
        score: null,
        evidence: ""
      },
      {
        id: "communication",
        name: "Communication",
        description: "Provides clear updates, documents progress, and escalates blockers appropriately",
        score: null,
        evidence: ""
      }
    ]
  },
  {
    id: "culture",
    name: "Culture & Collaboration",
    weight: 15,
    indicators: [
      {
        id: "teamwork",
        name: "Team Collaboration",
        description: "Works effectively with others, shares knowledge, and supports team members",
        score: null,
        evidence: ""
      },
      {
        id: "initiative",
        name: "Initiative & Ownership",
        description: "Takes proactive steps to improve processes and takes responsibility for outcomes",
        score: null,
        evidence: ""
      }
    ]
  },
  {
    id: "growth",
    name: "Professional Growth",
    weight: 10,
    indicators: [
      {
        id: "learning",
        name: "Continuous Learning",
        description: "Actively pursues skill development and applies new knowledge to work",
        score: null,
        evidence: ""
      }
    ]
  }
];

function validateSections(sections: SectionData[]): { valid: boolean; missing: number } {
  let missing = 0;
  
  for (const section of sections) {
    for (const indicator of section.indicators) {
      if (indicator.score === null) {
        missing++;
        continue;
      }
      // Score 0, 1, 3, 4 require evidence
      if (indicator.score !== 2 && indicator.evidence.trim().length === 0) {
        missing++;
      }
    }
  }
  
  return { valid: missing === 0, missing };
}

export default function SelfAssessment() {
  const [sections, setSections] = useState<SectionData[]>(initialSections);
  const [isSaving, setIsSaving] = useState(false);

  const validation = useMemo(() => validateSections(sections), [sections]);

  const handleIndicatorChange = (sectionId: string, indicatorId: string, updates: Partial<IndicatorData>) => {
    setSections(prev => prev.map(section => {
      if (section.id !== sectionId) return section;
      
      return {
        ...section,
        indicators: section.indicators.map(indicator => {
          if (indicator.id !== indicatorId) return indicator;
          return { ...indicator, ...updates };
        })
      };
    }));
  };

  const handleSaveDraft = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast({
        title: "Draft Saved",
        description: "Your self-assessment has been saved as a draft.",
      });
    }, 1000);
  };

  const handleSubmit = () => {
    if (!validation.valid) {
      toast({
        title: "Cannot Submit",
        description: `${validation.missing} indicator(s) require completion or evidence.`,
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Assessment Submitted",
      description: "Your self-assessment has been submitted for review.",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container py-8">
        {/* Page Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
            <Briefcase className="h-4 w-4" />
            <span>Web Developer</span>
            <span className="text-border">•</span>
            <Calendar className="h-4 w-4" />
            <span>Q4 2024 Review Period</span>
          </div>
          
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground tracking-tight">Self-Assessment</h1>
              <p className="text-muted-foreground mt-1">
                Rate your performance honestly. Remember: <span className="font-medium text-foreground">No Evidence, No Score.</span>
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                Draft Mode
              </Badge>
            </div>
          </div>
        </div>
        
        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Assessment Form */}
          <div className="lg:col-span-8 space-y-6">
            {sections.map(section => (
              <AssessmentSection
                key={section.id}
                section={section}
                onIndicatorChange={(indicatorId, updates) => 
                  handleIndicatorChange(section.id, indicatorId, updates)
                }
              />
            ))}
            
            {/* Submit Section */}
            <div className="flex items-center justify-between p-4 bg-card border rounded-xl">
              <div>
                {validation.valid ? (
                  <p className="text-sm text-evidence-success font-medium flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    All requirements met. Ready to submit.
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-evidence-alert">{validation.missing}</span> indicator(s) need completion or evidence
                  </p>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleSaveDraft}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? "Saving..." : "Save Draft"}
                </Button>
                <Button 
                  onClick={handleSubmit}
                  disabled={!validation.valid}
                  className={cn(
                    !validation.valid && "opacity-50 cursor-not-allowed"
                  )}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Submit Assessment
                </Button>
              </div>
            </div>
          </div>
          
          {/* Score Panel */}
          <div className="lg:col-span-4">
            <div className="sticky top-24">
              <WeightedScoreDisplay sections={sections} />
              
              {/* Legend */}
              <div className="mt-4 p-4 bg-card border rounded-xl">
                <h4 className="text-sm font-medium text-foreground mb-3">Score Guide</h4>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-evidence-alert" />
                    <span className="text-muted-foreground">0-1: Evidence of failure required</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-muted-foreground" />
                    <span className="text-muted-foreground">2: Meets standard (optional notes)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-evidence-success" />
                    <span className="text-muted-foreground">3-4: Evidence of achievement required</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
