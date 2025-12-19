import { useState } from "react";
import { cn } from "@/lib/utils";
import { ScoreSelector } from "./ScoreSelector";
import { EvidenceInput, EvidenceItem } from "./EvidenceInput";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ScoreOption {
  score: number;
  label: string;
  enabled: boolean;
}

export interface IndicatorData {
  id: string;
  name: string;
  description: string;
  score: number | null;
  evidence: string | EvidenceItem[];
  score_options?: ScoreOption[];
}

interface AssessmentIndicatorProps {
  indicator: IndicatorData;
  onChange: (updates: Partial<IndicatorData>) => void;
  index: number;
  readonly?: boolean;
}

export function AssessmentIndicator({ indicator, onChange, index, readonly = false }: AssessmentIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const hasEvidence = Array.isArray(indicator.evidence) 
    ? indicator.evidence.some(e => e.evidence.trim().length > 0)
    : typeof indicator.evidence === 'string' && indicator.evidence.trim().length > 0;
  
  const isComplete = indicator.score !== null && (
    indicator.score === 0 || hasEvidence
  );

  return (
    <div className={cn(
      "border rounded-lg overflow-hidden transition-all duration-200",
      isComplete ? "border-border" : "border-border/50",
      "bg-card"
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex items-center justify-center w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-mono">
            {index + 1}
          </span>
          <div className="text-left flex-1 min-w-0">
            <h4 className="font-medium text-foreground">{indicator.name}</h4>
            <p className="text-sm text-muted-foreground whitespace-normal">{indicator.description}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {indicator.score !== null && (
            <div className={cn(
              "px-3 py-1 rounded-full text-sm font-mono font-medium",
              indicator.score <= 1 && "bg-evidence-alert-bg text-evidence-alert border border-evidence-alert-border",
              indicator.score === 2 && "bg-muted text-muted-foreground border border-border",
              indicator.score >= 3 && "bg-evidence-success-bg text-evidence-success border border-evidence-success-border"
            )}>
              {indicator.score}/4
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
        <div className="px-4 pb-4 space-y-4 border-t border-border/50">
          <div className="pt-4">
            <label className="block text-sm font-medium text-muted-foreground mb-2">
              Performance Rating
            </label>
            <ScoreSelector
              value={indicator.score}
              onChange={(score) => onChange({ score })}
              disabled={readonly}
              scoreOptions={indicator.score_options}
            />
          </div>
          
          <EvidenceInput
            score={indicator.score}
            value={indicator.evidence}
            onChange={(evidence) => onChange({ evidence })}
            disabled={readonly}
          />
        </div>
      )}
    </div>
  );
}
