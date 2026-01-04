import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, User, UserCheck, FileText, ExternalLink } from "lucide-react";
import { useState } from "react";
import { EvidenceItem } from "./EvidenceInput";
import { ScoreSelector } from "./ScoreSelector";
import { Textarea } from "@/components/ui/textarea";

interface ScoreOption {
  score: number;
  label: string;
  enabled: boolean;
}

export interface ReviewIndicatorData {
  id: string;
  name: string;
  description: string;
  score_options?: ScoreOption[];
  evidence_guidance?: string | null;
  // Staff data
  staffScore: number | null;
  staffEvidence: string | EvidenceItem[];
  // Manager data
  managerScore: number | null;
  managerEvidence: string | EvidenceItem[];
}

interface ReviewComparisonIndicatorProps {
  indicator: ReviewIndicatorData;
  index: number;
  onScoreChange?: (score: number) => void;
  onEvidenceChange?: (evidence: string) => void;
  readonly?: boolean;
}

function getScoreLabel(score: number | null, options?: ScoreOption[]): string {
  if (score === null) return "Not rated";
  if (options) {
    const option = options.find(o => o.score === score);
    if (option) return option.label;
  }
  return `Score ${score}`;
}

function renderEvidenceContent(evidence: string | EvidenceItem[]) {
  if (!evidence) return <span className="text-muted-foreground italic">No evidence provided</span>;

  if (typeof evidence === 'string') {
    if (!evidence.trim()) return <span className="text-muted-foreground italic">No evidence provided</span>;
    return <p className="text-sm">{evidence}</p>;
  }

  if (Array.isArray(evidence)) {
    const validItems = evidence.filter(e => e.evidence?.trim());
    if (validItems.length === 0) {
      return <span className="text-muted-foreground italic">No evidence provided</span>;
    }

    return (
      <div className="space-y-2">
        {validItems.map((item, idx) => (
          <div key={idx} className="text-sm">
            {item.evidence.startsWith('http') ? (
              <a
                href={item.evidence}
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline inline-flex items-center gap-1 font-medium"
              >
                <ExternalLink className="h-3 w-3" />
                {item.name || (item.evidence.length > 50 ? item.evidence.substring(0, 50) + '...' : item.evidence)}
              </a>
            ) : (
              <span className="font-medium text-foreground">{item.name || item.evidence}</span>
            )}
            {item.notes && (
              <p className="text-muted-foreground mt-1 pl-4 border-l-2 border-border">{item.notes}</p>
            )}
          </div>
        ))}
      </div>
    );
  }

  return null;
}

export function ReviewComparisonIndicator({
  indicator,
  index,
  onScoreChange,
  onEvidenceChange,
  readonly
}: ReviewComparisonIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const scoreDiff = indicator.managerScore !== null && indicator.staffScore !== null
    ? indicator.managerScore - indicator.staffScore
    : null;

  return (
    <div className="border rounded-lg overflow-hidden bg-card">
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
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Score comparison badges */}
          <div className="flex items-center gap-2">
            {/* Staff Score */}
            <div className={cn(
              "px-2 py-0.5 rounded text-xs font-mono flex items-center gap-1",
              "bg-muted text-muted-foreground border border-border"
            )}>
              <User className="h-3 w-3" />
              {indicator.staffScore ?? '-'}/4
            </div>

            {/* Manager Score */}
            <div className={cn(
              "px-2 py-0.5 rounded text-xs font-mono flex items-center gap-1",
              indicator.managerScore !== null && indicator.managerScore <= 1 && "bg-evidence-alert-bg text-evidence-alert border border-evidence-alert-border",
              indicator.managerScore !== null && indicator.managerScore === 2 && "bg-muted text-muted-foreground border border-border",
              indicator.managerScore !== null && indicator.managerScore >= 3 && "bg-evidence-success-bg text-evidence-success border border-evidence-success-border",
              indicator.managerScore === null && "bg-muted text-muted-foreground border border-border"
            )}>
              <UserCheck className="h-3 w-3" />
              {indicator.managerScore ?? '-'}/4
            </div>

            {/* Difference indicator */}
            {scoreDiff !== null && scoreDiff !== 0 && (
              <span className={cn(
                "text-xs font-medium",
                scoreDiff > 0 && "text-evidence-success",
                scoreDiff < 0 && "text-evidence-alert"
              )}>
                {scoreDiff > 0 ? '+' : ''}{scoreDiff}
              </span>
            )}
          </div>

          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border/50">
          <p className="text-sm text-muted-foreground py-3">{indicator.description}</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Staff Assessment */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/50">
              <div className="flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Self Assessment</span>
              </div>

              <div className="mb-3">
                <span className="text-xs text-muted-foreground">Score</span>
                <div className={cn(
                  "mt-1 inline-flex px-3 py-1 rounded-full text-sm font-mono font-medium",
                  indicator.staffScore !== null && indicator.staffScore <= 1 && "bg-evidence-alert-bg text-evidence-alert",
                  indicator.staffScore !== null && indicator.staffScore === 2 && "bg-muted text-muted-foreground",
                  indicator.staffScore !== null && indicator.staffScore >= 3 && "bg-evidence-success-bg text-evidence-success",
                  indicator.staffScore === null && "bg-muted text-muted-foreground"
                )}>
                  {indicator.staffScore !== null ? `${indicator.staffScore}/4` : 'Not rated'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {getScoreLabel(indicator.staffScore, indicator.score_options)}
                </p>
              </div>

              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <FileText className="h-3 w-3" />
                  <span>Evidence</span>
                </div>
                {renderEvidenceContent(indicator.staffEvidence)}
              </div>
            </div>

            {/* Manager Assessment */}
            <div className="p-3 rounded-lg bg-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-3">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium text-primary">Manager Review</span>
              </div>

              <div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                  <FileText className="h-3 w-3" />
                  <span>Manager Feedback</span>
                </div>
                {!readonly && onScoreChange && onEvidenceChange ? (
                  <div className="space-y-4">
                    <ScoreSelector
                      value={indicator.managerScore}
                      onChange={onScoreChange}
                      scoreOptions={indicator.score_options?.map(o => ({ ...o, enabled: true }))}
                      hideEvidenceRequirement={true}
                    />
                    <div className="space-y-2">
                      <label className="text-xs font-medium text-muted-foreground">Rationale for Score (Optional)</label>
                      <Textarea
                        value={typeof indicator.managerEvidence === 'string' ? indicator.managerEvidence : ''}
                        onChange={(e) => onEvidenceChange(e.target.value)}
                        placeholder="Provide any additional feedback (optional)..."
                        className="min-h-[100px] bg-background border-primary/20 focus-visible:ring-primary/30"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="mb-3">
                      <span className="text-xs text-muted-foreground">Score</span>
                      <div className={cn(
                        "block mt-1 w-fit px-3 py-1 rounded-full text-sm font-mono font-medium",
                        indicator.managerScore !== null && indicator.managerScore <= 1 && "bg-evidence-alert-bg text-evidence-alert",
                        indicator.managerScore !== null && indicator.managerScore === 2 && "bg-muted text-muted-foreground",
                        indicator.managerScore !== null && indicator.managerScore >= 3 && "bg-evidence-success-bg text-evidence-success",
                        indicator.managerScore === null && "bg-muted text-muted-foreground"
                      )}>
                        {indicator.managerScore !== null ? `${indicator.managerScore}/4` : 'Not rated'}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 text-left">
                        {getScoreLabel(indicator.managerScore, indicator.score_options)}
                      </p>
                    </div>
                    <div className="mt-2">
                      <span className="text-xs text-muted-foreground block mb-1">Feedback:</span>
                      {renderEvidenceContent(indicator.managerEvidence)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
