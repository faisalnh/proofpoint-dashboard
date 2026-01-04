import { cn } from "@/lib/utils";
import { DomainData, KPIData } from "@/hooks/useAssessment";
import { EvidenceItem } from "./EvidenceInput";
import { TrendingUp, Award, AlertTriangle, Percent, Lock } from "lucide-react";

interface WeightedScoreDisplayProps {
  domains?: DomainData[];
  score?: number | null;
  label?: string;
  type?: 'staff' | 'manager';
}

function hasValidEvidence(evidence: string | EvidenceItem[]): boolean {
  if (Array.isArray(evidence)) {
    return evidence.some(e => e.evidence.trim().length > 0);
  }
  return typeof evidence === 'string' && evidence.trim().length > 0;
}

function calculateWeightedScore(domains: DomainData[] | undefined | null, type: 'staff' | 'manager' = 'staff'): number | null {
  if (!domains || !Array.isArray(domains)) return null;

  let totalWeight = 0;
  let weightedSum = 0;

  for (const domain of domains) {
    let allKPIs: KPIData[] = [];
    domain.standards.forEach(s => {
      allKPIs = [...allKPIs, ...s.kpis];
    });

    const scoredKPIs = allKPIs.filter(k => {
      const s = type === 'staff' ? k.score : k.managerScore;
      return s !== null && s !== undefined && s !== 'X';
    });

    if (scoredKPIs.length === 0) continue;

    const domainAvg = scoredKPIs.reduce((acc, k) => {
      const s = type === 'staff' ? k.score : k.managerScore;
      return acc + (Number(s) || 0);
    }, 0) / scoredKPIs.length;

    weightedSum += domainAvg * domain.weight;
    totalWeight += domain.weight;
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

function getLetterGrade(score: number): { grade: string; label: string; description: string; bonusPayout: number } {
  if (score >= 3.9) return {
    grade: "★",
    label: "Exemplary",
    description: "Outstanding performance that exceeds expectations across all domains. Recognizes employees who consistently demonstrate innovation, leadership, and exceptional contributions.",
    bonusPayout: 100
  };
  if (score >= 3.6) return {
    grade: "◆",
    label: "Trail Blazers",
    description: "High-performing individuals who go beyond role expectations and actively contribute to team and organizational success. Strong candidates for leadership development.",
    bonusPayout: 90
  };
  if (score >= 3.4) return {
    grade: "▲",
    label: "Rising Star",
    description: "Employees showing significant growth and potential. Consistently meets expectations with notable areas of excellence. On track for advancement with continued development.",
    bonusPayout: 80
  };
  if (score >= 3.2) return {
    grade: "●",
    label: "Solid Foundation",
    description: "Reliably meets role expectations and demonstrates competence across key performance areas. A stable contributor who forms the backbone of the team.",
    bonusPayout: 65
  };
  if (score >= 3.0) return {
    grade: "◐",
    label: "Developing Under Guidance",
    description: "Entry level grade. Contract employees are expected to progress to Solid Foundation within 1 year, permanent employees within 2 years, or risk being bumped down to Needs Improvement.",
    bonusPayout: 50
  };
  if (score >= 2.8) return {
    grade: "○",
    label: "Needs Improvement",
    description: "This grade can be given a maximum of two times. By the third PA, staff must have progressed to the next grade, or they will be bumped down to Performance Management.",
    bonusPayout: 40
  };
  if (score >= 2.6) return {
    grade: "!",
    label: "Performance Management",
    description: "At least 6 months, but no more than 1 year, depending on urgency. If staff does not improve, they will likely be let go from their role in the school.",
    bonusPayout: 10
  };
  return {
    grade: "—",
    label: "Below Threshold",
    description: "Performance is critically below acceptable standards. Immediate intervention and a formal performance improvement plan are required.",
    bonusPayout: 0
  };
}

export function WeightedScoreDisplay({ domains, score, label, type = 'staff' }: WeightedScoreDisplayProps) {
  const calculatedScore = calculateWeightedScore(domains, type);
  const weightedScore = score !== undefined && score !== null ? score : calculatedScore;
  const gradeInfo = weightedScore !== null ? getLetterGrade(weightedScore) : null;

  // Calculate completion if domains are provided
  const hasDomains = domains && Array.isArray(domains) && domains.length > 0;
  let totalKPIs = 0;
  let completedKPIs = 0;

  if (hasDomains) {
    domains!.forEach(d => {
      d.standards.forEach(s => {
        s.kpis.forEach(k => {
          totalKPIs++;
          const val = type === 'manager' ? k.managerScore : k.score;
          if (type === 'manager') {
            if (val !== null && val !== undefined) completedKPIs++;
          } else {
            if (val !== null && (val === 'X' || hasValidEvidence(k.evidence))) completedKPIs++;
          }
        });
      });
    });
  }

  const completionPercent = totalKPIs > 0 ? (completedKPIs / totalKPIs) * 100 : 0;

  const isComplete = completionPercent === 100;

  const Icon = weightedScore !== null && isComplete
    ? (weightedScore >= 3 ? Award : weightedScore >= 2 ? TrendingUp : AlertTriangle)
    : Lock;


  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-md">
      {/* Main Score */}
      <div className="p-6 text-center border-b bg-gradient-to-b from-muted/30 to-background">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Icon className={cn(
            "h-5 w-5",
            (!isComplete || weightedScore === null) && "text-muted-foreground",
            isComplete && weightedScore !== null && weightedScore < 2 && "text-evidence-alert",
            isComplete && weightedScore !== null && weightedScore >= 2 && weightedScore < 3 && "text-amber-500",
            isComplete && weightedScore !== null && weightedScore >= 3 && "text-evidence-success"
          )} />
          <span className="text-xs uppercase font-bold tracking-widest text-muted-foreground">
            {!isComplete ? "Score Locked" : (label || "Performance Score")}
          </span>
        </div>

        <div className={cn(
          "text-5xl font-mono font-black tracking-tighter transition-all duration-500",
          (!isComplete || weightedScore === null) && "text-muted-foreground/30",
          isComplete && weightedScore !== null && weightedScore < 2 && "text-evidence-alert",
          isComplete && weightedScore !== null && weightedScore >= 2 && weightedScore < 3 && "text-amber-500",
          isComplete && weightedScore !== null && weightedScore >= 3 && "text-evidence-success"
        )}>
          {isComplete && weightedScore !== null ? weightedScore.toFixed(2) : "—.——"}
        </div>

        {!isComplete && (
          <p className="mt-3 text-[10px] text-muted-foreground/60 uppercase tracking-widest font-bold">
            Complete 100% of framework to view
          </p>
        )}

        {isComplete && gradeInfo && (
          <div className="mt-4">
            <div className="flex items-center justify-center gap-3">
              <span className={cn(
                "text-2xl font-bold px-3 py-0.5 rounded-lg bg-background border shadow-sm",
                weightedScore! < 2.6 && "text-evidence-alert border-evidence-alert/30",
                weightedScore! >= 2.6 && weightedScore! < 3 && "text-amber-500 border-amber-500/30",
                weightedScore! >= 3 && "text-evidence-success border-evidence-success/30"
              )}>
                {gradeInfo.grade}
              </span>
              <div className="text-left">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Performance Tier</div>
                <div className="text-sm font-bold">{gradeInfo.label}</div>
              </div>
            </div>
            <p className="mt-3 text-xs text-muted-foreground leading-relaxed text-center px-2">
              {gradeInfo.description}
            </p>
            <div className="mt-4 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Bonus Payout</span>
                <span className={cn(
                  "text-lg font-mono font-black",
                  gradeInfo.bonusPayout >= 80 && "text-evidence-success",
                  gradeInfo.bonusPayout >= 50 && gradeInfo.bonusPayout < 80 && "text-amber-500",
                  gradeInfo.bonusPayout < 50 && "text-evidence-alert"
                )}>
                  {gradeInfo.bonusPayout}%
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Completion Progress */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Framework Coverage</span>
          <span className="text-sm font-mono font-bold">
            {completedKPIs}/{totalKPIs}
          </span>
        </div>
        <div className="h-2.5 bg-muted rounded-full overflow-hidden border">
          <div
            className={cn(
              "h-full transition-all duration-700 rounded-full",
              completionPercent < 50 && "bg-evidence-alert",
              completionPercent >= 50 && completionPercent < 100 && "bg-amber-400",
              completionPercent === 100 && "bg-evidence-success"
            )}
            style={{ width: `${completionPercent}%` }}
          />
        </div>
        {completionPercent < 100 && (
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            {totalKPIs - completedKPIs} KPIs remaining to complete assessment
          </p>
        )}
      </div>

      {/* Domain Breakdown */}
      {hasDomains && (
        <div className="px-4 py-3 space-y-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1 flex items-center justify-between">
            <span>Domain Averages</span>
            <span>Avg Score</span>
          </div>
          {domains!.map(domain => {
            let domainKPIs: KPIData[] = [];
            domain.standards.forEach(s => {
              domainKPIs = [...domainKPIs, ...s.kpis];
            });

            const scoredKPIs = domainKPIs.filter(k => {
              const val = type === 'manager' ? k.managerScore : k.score;
              return val !== null && val !== undefined && val !== 'X';
            });

            const avg = scoredKPIs.length > 0
              ? scoredKPIs.reduce((a, k) => {
                const val = type === 'manager' ? k.managerScore : k.score;
                return a + (Number(val) || 0);
              }, 0) / scoredKPIs.length
              : null;

            return (
              <div key={domain.id} className="flex items-center justify-between text-sm group">
                <span className="text-muted-foreground truncate hover:text-foreground transition-colors flex-1 mr-2" title={domain.name}>{domain.name}</span>
                {avg !== null ? (
                  <span className={cn(
                    "font-mono font-bold text-base px-2 py-0.5 rounded bg-muted/30 min-w-[3rem] text-center",
                    avg < 2 && "text-evidence-alert",
                    avg >= 2 && avg < 3 && "text-amber-500",
                    avg >= 3 && "text-evidence-success"
                  )}>
                    {avg.toFixed(1)}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-muted-foreground/30 uppercase tracking-tighter italic">Pending</span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
