import { cn } from "@/lib/utils";
import { AssessmentIndicator, IndicatorData } from "./AssessmentIndicator";
import { Percent } from "lucide-react";

export interface SectionData {
  id: string;
  name: string;
  weight: number;
  indicators: IndicatorData[];
}

interface AssessmentSectionProps {
  section: SectionData;
  onIndicatorChange: (indicatorId: string, updates: Partial<IndicatorData>) => void;
}

function calculateSectionScore(indicators: IndicatorData[]): number | null {
  const scoredIndicators = indicators.filter(i => i.score !== null);
  if (scoredIndicators.length === 0) return null;
  
  const sum = scoredIndicators.reduce((acc, i) => acc + (i.score ?? 0), 0);
  return sum / scoredIndicators.length;
}

export function AssessmentSection({ section, onIndicatorChange }: AssessmentSectionProps) {
  const sectionScore = calculateSectionScore(section.indicators);
  const completedCount = section.indicators.filter(i => 
    i.score !== null && (i.score === 2 || i.evidence.trim().length > 0)
  ).length;
  
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
              {completedCount} of {section.indicators.length} indicators completed
            </p>
          </div>
        </div>
        
        {sectionScore !== null && (
          <div className="text-right">
            <div className={cn(
              "text-2xl font-mono font-bold",
              sectionScore < 2 && "text-evidence-alert",
              sectionScore >= 2 && sectionScore < 3 && "text-muted-foreground",
              sectionScore >= 3 && "text-evidence-success"
            )}>
              {sectionScore.toFixed(2)}
            </div>
            <div className="text-xs text-muted-foreground">Section Score</div>
          </div>
        )}
      </div>
      
      {/* Indicators */}
      <div className="p-4 space-y-3">
        {section.indicators.map((indicator, index) => (
          <AssessmentIndicator
            key={indicator.id}
            indicator={indicator}
            index={index}
            onChange={(updates) => onIndicatorChange(indicator.id, updates)}
          />
        ))}
      </div>
    </div>
  );
}
