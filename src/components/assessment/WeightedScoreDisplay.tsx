import { cn } from "@/lib/utils";
import { SectionData } from "./AssessmentSection";
import { TrendingUp, Award, AlertTriangle } from "lucide-react";

interface WeightedScoreDisplayProps {
  sections: SectionData[];
}

function calculateWeightedScore(sections: SectionData[]): number | null {
  let totalWeight = 0;
  let weightedSum = 0;
  
  for (const section of sections) {
    const scoredIndicators = section.indicators.filter(i => i.score !== null);
    if (scoredIndicators.length === 0) continue;
    
    const sectionAvg = scoredIndicators.reduce((acc, i) => acc + (i.score ?? 0), 0) / scoredIndicators.length;
    weightedSum += sectionAvg * section.weight;
    totalWeight += section.weight;
  }
  
  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

function getLetterGrade(score: number): { grade: string; label: string } {
  if (score > 3.71) return { grade: "A+", label: "Exceptional" };
  if (score > 3.41) return { grade: "A", label: "Outstanding" };
  if (score > 3.11) return { grade: "A-", label: "Excellent" };
  if (score > 2.71) return { grade: "B+", label: "Very Good" };
  if (score > 2.41) return { grade: "B", label: "Good" };
  if (score > 2.11) return { grade: "B-", label: "Above Average" };
  if (score > 1.71) return { grade: "C+", label: "Satisfactory" };
  if (score > 1.41) return { grade: "C", label: "Adequate" };
  if (score > 1.11) return { grade: "C-", label: "Needs Improvement" };
  if (score > 0.71) return { grade: "D", label: "Below Standard" };
  return { grade: "F", label: "Unsatisfactory" };
}

export function WeightedScoreDisplay({ sections }: WeightedScoreDisplayProps) {
  const weightedScore = calculateWeightedScore(sections);
  const gradeInfo = weightedScore !== null ? getLetterGrade(weightedScore) : null;
  
  // Calculate completion
  const totalIndicators = sections.reduce((acc, s) => acc + s.indicators.length, 0);
  const completedIndicators = sections.reduce(
    (acc, s) => acc + s.indicators.filter(i => 
      i.score !== null && (i.score === 2 || i.evidence.trim().length > 0)
    ).length,
    0
  );
  const completionPercent = totalIndicators > 0 ? (completedIndicators / totalIndicators) * 100 : 0;

  const Icon = weightedScore !== null 
    ? (weightedScore >= 3 ? Award : weightedScore >= 2 ? TrendingUp : AlertTriangle)
    : TrendingUp;

  return (
    <div className="bg-card border rounded-xl overflow-hidden">
      {/* Main Score */}
      <div className="p-6 text-center border-b">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Icon className={cn(
            "h-5 w-5",
            weightedScore === null && "text-muted-foreground",
            weightedScore !== null && weightedScore < 2 && "text-evidence-alert",
            weightedScore !== null && weightedScore >= 2 && weightedScore < 3 && "text-muted-foreground",
            weightedScore !== null && weightedScore >= 3 && "text-evidence-success"
          )} />
          <span className="text-sm font-medium text-muted-foreground">Weighted Score</span>
        </div>
        
        <div className={cn(
          "text-5xl font-mono font-bold tracking-tight",
          weightedScore === null && "text-muted-foreground/30",
          weightedScore !== null && weightedScore < 2 && "text-evidence-alert",
          weightedScore !== null && weightedScore >= 2 && weightedScore < 3 && "text-foreground",
          weightedScore !== null && weightedScore >= 3 && "text-evidence-success"
        )}>
          {weightedScore !== null ? weightedScore.toFixed(2) : "—.——"}
        </div>
        
        {gradeInfo && (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className={cn(
              "text-2xl font-bold",
              weightedScore! < 2 && "text-evidence-alert",
              weightedScore! >= 2 && weightedScore! < 3 && "text-foreground",
              weightedScore! >= 3 && "text-evidence-success"
            )}>
              {gradeInfo.grade}
            </span>
            <span className="text-sm text-muted-foreground">• {gradeInfo.label}</span>
          </div>
        )}
      </div>
      
      {/* Completion Progress */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm text-muted-foreground">Completion</span>
          <span className="text-sm font-mono font-medium">
            {completedIndicators}/{totalIndicators}
          </span>
        </div>
        <div className="h-2 bg-muted rounded-full overflow-hidden">
          <div 
            className={cn(
              "h-full transition-all duration-500 rounded-full",
              completionPercent < 50 && "bg-evidence-alert",
              completionPercent >= 50 && completionPercent < 100 && "bg-primary",
              completionPercent === 100 && "bg-evidence-success"
            )}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
      </div>
      
      {/* Section Breakdown */}
      <div className="px-4 pb-4 space-y-2">
        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
          Section Weights
        </div>
        {sections.map(section => {
          const sectionScore = section.indicators.filter(i => i.score !== null);
          const avg = sectionScore.length > 0 
            ? sectionScore.reduce((a, i) => a + (i.score ?? 0), 0) / sectionScore.length 
            : null;
          
          return (
            <div key={section.id} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-primary">{section.weight}%</span>
                <span className="text-muted-foreground">{section.name}</span>
              </div>
              {avg !== null && (
                <span className={cn(
                  "font-mono font-medium",
                  avg < 2 && "text-evidence-alert",
                  avg >= 2 && avg < 3 && "text-foreground",
                  avg >= 3 && "text-evidence-success"
                )}>
                  {avg.toFixed(2)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
