import { cn } from "@/lib/utils";
import { ReviewComparisonIndicator, ReviewIndicatorData } from "./ReviewComparisonIndicator";
import { Percent } from "lucide-react";
import { IndicatorData } from "@/hooks/useAssessment";

export interface ReviewSectionData {
  id: string;
  name: string;
  weight: number;
  indicators: ReviewIndicatorData[];
}

function calculateSectionScore(indicators: ReviewIndicatorData[], type: 'staff' | 'manager'): number | null {
  const scores = indicators.map(i => type === 'staff' ? i.staffScore : i.managerScore).filter((s): s is number => s !== null);
  if (scores.length === 0) return null;
  return scores.reduce((a, b) => a + b, 0) / scores.length;
}

interface ReviewComparisonSectionProps {
  section: ReviewSectionData;
  onIndicatorChange?: (indicatorId: string, updates: Partial<IndicatorData>) => void;
  readonly?: boolean;
}

export function ReviewComparisonSection({ section, onIndicatorChange, readonly }: ReviewComparisonSectionProps) {
  const staffScore = calculateSectionScore(section.indicators, 'staff');
  const managerScore = calculateSectionScore(section.indicators, 'manager');

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Section Header */}
      <div className="px-5 py-4 bg-secondary/30 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-primary">
            <Percent className="h-4 w-4" />
            <span className="font-mono font-semibold text-sm">{section.weight}%</span>
          </div>
          <div>
            <h3 className="font-semibold text-foreground">{section.name}</h3>
            <p className="text-xs text-muted-foreground">
              {section.indicators.length} indicators
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Staff Score */}
          {staffScore !== null && (
            <div className="text-right">
              <div className={cn(
                "text-lg font-mono font-bold",
                staffScore < 2 && "text-evidence-alert",
                staffScore >= 2 && staffScore < 3 && "text-muted-foreground",
                staffScore >= 3 && "text-evidence-success"
              )}>
                {staffScore.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Self</div>
            </div>
          )}

          {/* Manager Score */}
          {managerScore !== null && (
            <div className="text-right">
              <div className={cn(
                "text-lg font-mono font-bold text-primary",
              )}>
                {managerScore.toFixed(2)}
              </div>
              <div className="text-xs text-muted-foreground">Manager</div>
            </div>
          )}
        </div>
      </div>

      {/* Indicators */}
      <div className="p-4 space-y-3">
        {section.indicators.map((indicator, index) => (
          <ReviewComparisonIndicator
            key={indicator.id}
            indicator={indicator}
            index={index}
            onScoreChange={(score) => onIndicatorChange?.(indicator.id, { managerScore: score })}
            onEvidenceChange={(evidence) => onIndicatorChange?.(indicator.id, { managerEvidence: evidence })}
            readonly={readonly}
          />
        ))}
      </div>
    </div>
  );
}
