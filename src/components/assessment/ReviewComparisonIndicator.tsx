import { cn } from "@/lib/utils";
import { ChevronDown, ChevronUp, User, UserCheck, FileText, ExternalLink, Info, BookOpen } from "lucide-react";
import { useState } from "react";
import { EvidenceItem } from "./EvidenceInput";
import { ScoreSelector } from "./ScoreSelector";
import { Textarea } from "@/components/ui/textarea";

export interface ReviewIndicatorData {
  id: string;
  name: string;
  description: string;
  rubric_4: string;
  rubric_3: string;
  rubric_2: string;
  rubric_1: string;
  evidence_guidance?: string | null;
  // Staff data
  staffScore: number | 'X' | null;
  staffEvidence: string | EvidenceItem[];
  // Manager data
  managerScore: number | 'X' | null;
  managerEvidence: string | EvidenceItem[];
}

interface ReviewComparisonIndicatorProps {
  indicator: ReviewIndicatorData;
  index: number;
  onScoreChange?: (score: number | 'X') => void;
  onEvidenceChange?: (evidence: string) => void;
  readonly?: boolean;
  reviewerLabel?: string;
}

function getScoreLabel(score: number | 'X' | null): string {
  if (score === null) return "Not rated";
  if (score === 'X') return "Not Implemented Yet";

  const labels: Record<number, string> = {
    1: "Beginning",
    2: "Developing",
    3: "Proficient",
    4: "Exemplary"
  };

  return labels[score as number];
}

function renderEvidenceContent(evidence: string | EvidenceItem[]) {
  if (!evidence) return <span className="text-muted-foreground italic">No evidence provided</span>;

  if (typeof evidence === 'string') {
    if (!evidence.trim()) return <span className="text-muted-foreground italic">No evidence provided</span>;
    return <p className="text-sm whitespace-pre-wrap">{evidence}</p>;
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
              <p className="text-muted-foreground mt-1 pl-4 border-l-2 border-border italic">{item.notes}</p>
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
  readonly,
  reviewerLabel = "Manager Review"
}: ReviewComparisonIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const rubricDescriptions = {
    4: indicator.rubric_4,
    3: indicator.rubric_3,
    2: indicator.rubric_2,
    1: indicator.rubric_1,
  };

  const getScoreDiff = () => {
    if (indicator.managerScore === 'X' || indicator.staffScore === 'X') return null;
    if (indicator.managerScore === null || indicator.staffScore === null) return null;
    return Number(indicator.managerScore) - Number(indicator.staffScore);
  };

  const scoreDiff = getScoreDiff();

  return (
    <div className={cn(
      "border rounded-xl overflow-hidden bg-card transition-all duration-300",
      isExpanded ? "shadow-md" : "hover:shadow-sm"
    )}>
      {/* Header */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-4 hover:bg-muted/30 transition-colors gap-4"
      >
        <div className="flex items-center gap-4 flex-1 min-w-0">
          <span className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted text-muted-foreground text-xs font-mono font-bold shrink-0">
            {index + 1}
          </span>
          <div className="text-left flex-1 min-w-0">
            <h4 className="font-bold text-foreground truncate">{indicator.name}</h4>
          </div>
        </div>

        <div className="flex items-center gap-4 shrink-0">
          {/* Score comparison badges */}
          <div className="flex items-center gap-3">
            {/* Staff Score */}
            <div className={cn(
              "px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5",
              "bg-muted/50 text-muted-foreground border border-border"
            )}>
              <User className="h-3 w-3 scale-90" />
              {indicator.staffScore === 'X' ? 'X' : indicator.staffScore ?? '-'}/4
            </div>

            {/* Manager Score */}
            <div className={cn(
              "px-3 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 shadow-sm",
              indicator.managerScore === 'X' && "bg-slate-500 text-white border-slate-600",
              indicator.managerScore !== 'X' && indicator.managerScore !== null && indicator.managerScore <= 1 && "bg-evidence-alert text-white border-evidence-alert",
              indicator.managerScore !== 'X' && indicator.managerScore === 2 && "bg-amber-500 text-white border-amber-600",
              indicator.managerScore !== 'X' && indicator.managerScore !== null && indicator.managerScore >= 3 && "bg-evidence-success text-white border-evidence-success",
              indicator.managerScore === null && "bg-muted text-muted-foreground border border-border"
            )}>
              <UserCheck className="h-3 w-3 scale-90" />
              {indicator.managerScore === 'X' ? 'X' : indicator.managerScore ?? '-'}/4
            </div>

            {/* Difference indicator */}
            {scoreDiff !== null && scoreDiff !== 0 && (
              <span className={cn(
                "text-xs font-black w-8 text-center",
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
        <div className="px-5 pb-6 border-t border-border/50 animate-in slide-in-from-top-2">
          <div className="py-4 space-y-4">
            <div className="p-3 rounded-lg bg-muted/20 border border-border/50">
              <div className="flex items-center gap-2 mb-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                <BookOpen className="h-3.5 w-3.5" />
                Measurement Description
              </div>
              <p className="text-sm text-foreground leading-relaxed">{indicator.description}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Staff Assessment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Self Assessment</span>
              </div>

              <div className="p-4 rounded-xl bg-muted/10 border border-border/50 space-y-4">
                <div>
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest block mb-2">Selected Rating</span>
                  <div className={cn(
                    "inline-flex px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm",
                    indicator.staffScore === 'X' && "bg-slate-100 text-slate-500 border border-slate-200",
                    indicator.staffScore !== 'X' && indicator.staffScore !== null && indicator.staffScore <= 1 && "bg-evidence-alert-bg text-evidence-alert border border-evidence-alert-border",
                    indicator.staffScore !== 'X' && indicator.staffScore === 2 && "bg-muted text-muted-foreground border border-border",
                    indicator.staffScore !== 'X' && indicator.staffScore !== null && indicator.staffScore >= 3 && "bg-emerald-50 text-emerald-600 border border-emerald-100",
                    indicator.staffScore === null && "bg-muted text-muted-foreground"
                  )}>
                    {getScoreLabel(indicator.staffScore)}
                  </div>
                  {indicator.staffScore !== null && indicator.staffScore !== 'X' && (
                    <p className="text-xs text-muted-foreground mt-2 leading-relaxed italic">
                      {rubricDescriptions[indicator.staffScore as keyof typeof rubricDescriptions]}
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-2">
                    <FileText className="h-3.5 w-3.5" />
                    <span>Evidence Provided</span>
                  </div>
                  <div className="bg-background rounded-lg border border-border/50 p-3 shadow-inner min-h-[80px]">
                    {renderEvidenceContent(indicator.staffEvidence)}
                  </div>
                </div>
              </div>
            </div>

            {/* Manager Assessment */}
            <div className="space-y-4">
              <div className="flex items-center gap-2 pb-2 border-b border-primary/20">
                <UserCheck className="h-4 w-4 text-primary" />
                <span className="text-xs font-bold uppercase tracking-widest text-primary">{reviewerLabel}</span>
              </div>

              <div className="p-4 rounded-xl bg-primary/[0.02] border border-primary/10 space-y-4">
                {!readonly && onScoreChange && onEvidenceChange ? (
                  <div className="space-y-5">
                    <div>
                      <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block mb-3">Assign Rating</span>
                      <ScoreSelector
                        value={indicator.managerScore}
                        onChange={onScoreChange}
                        rubricDescriptions={rubricDescriptions}
                        hideEvidenceRequirement={true}
                        hideNotImplemented={true}
                        disabled={indicator.staffScore === 'X'}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-1.5 text-[10px] font-bold text-primary/60 uppercase tracking-widest">
                        <Info className="h-3.5 w-3.5" />
                        <span>Rationale & Feedback</span>
                      </div>
                      <Textarea
                        value={typeof indicator.managerEvidence === 'string' ? indicator.managerEvidence : ''}
                        onChange={(e) => onEvidenceChange(e.target.value)}
                        placeholder="Provide specific feedback, suggestions, or rationale for this score..."
                        className="min-h-[120px] bg-background border-primary/20 focus-visible:ring-primary/30"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div>
                      <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block mb-2">Assigned Rating</span>
                      <div className={cn(
                        "inline-flex px-4 py-1.5 rounded-lg text-sm font-bold shadow-sm",
                        indicator.managerScore === 'X' && "bg-slate-500 text-white",
                        indicator.managerScore !== 'X' && indicator.managerScore !== null && indicator.managerScore <= 1 && "bg-evidence-alert text-white",
                        indicator.managerScore !== 'X' && indicator.managerScore === 2 && "bg-amber-500 text-white",
                        indicator.managerScore !== 'X' && indicator.managerScore !== null && indicator.managerScore >= 3 && "bg-evidence-success text-white",
                        indicator.managerScore === null && "bg-muted text-muted-foreground border border-border"
                      )}>
                        {getScoreLabel(indicator.managerScore)}
                      </div>
                      {indicator.managerScore !== null && indicator.managerScore !== 'X' && (
                        <p className="text-xs text-primary/80 mt-2 leading-relaxed font-medium italic">
                          {rubricDescriptions[indicator.managerScore as keyof typeof rubricDescriptions]}
                        </p>
                      )}
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-primary/60 uppercase tracking-widest block mb-2">{reviewerLabel.replace('Review', 'Feedback')}</span>
                      <div className="bg-background/80 rounded-lg border border-primary/10 p-3 shadow-inner min-h-[80px]">
                        {renderEvidenceContent(indicator.managerEvidence)}
                      </div>
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
