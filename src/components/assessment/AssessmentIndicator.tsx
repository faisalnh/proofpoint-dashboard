import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreSelector } from "./ScoreSelector";
import { EvidenceInput, EvidenceItem } from "./EvidenceInput";
import { ChevronDown, ChevronUp, BookOpen, Info, Lightbulb, ShieldCheck } from "lucide-react";

export interface KPIData {
  id: string;
  name: string;
  description: string | null;
  score: number | 'X' | null;
  evidence: string | EvidenceItem[];
  rubric_4: string;
  rubric_3: string;
  rubric_2: string;
  rubric_1: string;
  evidence_guidance?: string | null;
  trainings?: string | null;
}

interface AssessmentIndicatorProps {
  indicator: KPIData;
  onChange: (updates: Partial<KPIData>) => void;
  index: number;
  readonly?: boolean;
}

export function AssessmentIndicator({ indicator, onChange, index, readonly = false }: AssessmentIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const hasEvidence = Array.isArray(indicator.evidence)
    ? indicator.evidence.some(e => e.evidence.trim().length > 0)
    : typeof indicator.evidence === 'string' && indicator.evidence.trim().length > 0;

  const isComplete = indicator.score !== null && (
    indicator.score === 'X' || hasEvidence
  );

  const rubricDescriptions = {
    4: indicator.rubric_4,
    3: indicator.rubric_3,
    2: indicator.rubric_2,
    1: indicator.rubric_1,
  };

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all duration-300",
      isComplete ? "border-border shadow-sm" : "border-primary/20 bg-primary/[0.01]",
      "bg-card"
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors gap-4"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/10 text-primary text-xs font-mono font-bold shrink-0">
            {index + 1}
          </span>
          <div className="text-left flex-1 min-w-0">
            <h4 className="font-bold text-foreground truncate">{indicator.name}</h4>
            {indicator.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">{indicator.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {indicator.score !== null && (
            <div className={cn(
              "px-3 py-1 rounded-lg text-sm font-mono font-bold shadow-sm",
              indicator.score === 'X' && "bg-slate-100 text-slate-500 border border-slate-200",
              indicator.score === 1 && "bg-evidence-alert-bg text-evidence-alert border border-evidence-alert-border",
              indicator.score === 2 && "bg-muted text-muted-foreground border border-border",
              indicator.score === 3 && "bg-emerald-50 text-emerald-600 border border-emerald-100",
              indicator.score === 4 && "bg-score-4 text-white"
            )}>
              {indicator.score === 'X' ? 'X' : `${indicator.score}/4`}
            </div>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && (
        <div className="px-4 pb-6 space-y-6 border-t border-border/50 animate-in slide-in-from-top-2 duration-300">
          {/* Measurement Info */}
          {(indicator.description || indicator.evidence_guidance) && (
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              {indicator.description && (
                <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
                  <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    <BookOpen className="h-3.5 w-3.5" />
                    Measurement
                  </div>
                  <p className="text-sm text-foreground leading-relaxed">{indicator.description}</p>
                </div>
              )}
              {indicator.evidence_guidance && (
                <div className="p-3 rounded-lg bg-primary/[0.02] border border-primary/10">
                  <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-primary uppercase tracking-wider">
                    <Lightbulb className="h-3.5 w-3.5" />
                    Evidence Guidance
                  </div>
                  <p className="text-sm text-foreground leading-relaxed italic">{indicator.evidence_guidance}</p>
                </div>
              )}
            </div>
          )}

          <div>
            <label className="block text-sm font-bold text-muted-foreground mb-3 flex items-center gap-2">
              <Info className="h-4 w-4" />
              Performance Rating
            </label>
            <ScoreSelector
              value={indicator.score}
              onChange={(score) => onChange({ score })}
              disabled={readonly}
              rubricDescriptions={rubricDescriptions}
            />
          </div>

          <div className="pt-2">
            <EvidenceInput
              score={indicator.score}
              value={indicator.evidence}
              onChange={(evidence) => onChange({ evidence })}
              disabled={readonly || indicator.score === 'X'}
            />
          </div>

          {indicator.trainings && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-emerald-700 uppercase tracking-wider">
                <ShieldCheck className="h-3.5 w-3.5" />
                Recommended Trainings
              </div>
              <p className="text-sm text-emerald-800">{indicator.trainings}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
