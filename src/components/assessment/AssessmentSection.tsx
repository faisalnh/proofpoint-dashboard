import { cn } from "@/lib/utils";
import { AssessmentIndicator, KPIData } from "./AssessmentIndicator";
import { EvidenceItem } from "./EvidenceInput";
import { Percent, Target, Layers } from "lucide-react";

export interface StandardData {
  id: string;
  name: string;
  kpis: KPIData[];
}

export interface DomainData {
  id: string;
  name: string;
  weight: number;
  standards: StandardData[];
}

function hasValidEvidence(evidence: string | EvidenceItem[]): boolean {
  if (Array.isArray(evidence)) {
    return evidence.some(e => e.evidence.trim().length > 0);
  }
  return typeof evidence === 'string' && evidence.trim().length > 0;
}

interface AssessmentSectionProps {
  section: DomainData;
  onIndicatorChange: (indicatorId: string, updates: Partial<KPIData>) => void;
  readonly?: boolean;
}

function calculateDomainScore(domain: DomainData): number | null {
  let allKPIs: KPIData[] = [];
  domain.standards.forEach(s => {
    allKPIs = [...allKPIs, ...s.kpis];
  });

  const scoredKPIs = allKPIs.filter(k => k.score !== null && k.score !== 'X');
  if (scoredKPIs.length === 0) return null;

  const sum = scoredKPIs.reduce((acc, k) => acc + (Number(k.score) || 0), 0);
  return sum / scoredKPIs.length;
}

export function AssessmentSection({ section, onIndicatorChange, readonly = false }: AssessmentSectionProps) {
  const domainScore = calculateDomainScore(section);

  let totalKPIs = 0;
  let completedKPIs = 0;

  section.standards.forEach(s => {
    s.kpis.forEach(k => {
      totalKPIs++;
      if (k.score !== null && (k.score === 'X' || hasValidEvidence(k.evidence))) {
        completedKPIs++;
      }
    });
  });

  return (
    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
      {/* Domain Header */}
      <div className="px-6 py-5 bg-primary/5 border-b flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center justify-center p-2 rounded-lg bg-primary/10 text-primary border border-primary/20 min-w-[60px]">
            <Percent className="h-4 w-4 mb-0.5" />
            <span className="font-mono font-bold text-sm">{section.weight}%</span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">{section.name}</h3>
            <div className="flex items-center gap-3 mt-1">
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Target className="h-3 w-3" />
                {completedKPIs} of {totalKPIs} KPIs completed
              </p>
              <span className="text-muted-foreground opacity-20">|</span>
              <p className="text-xs text-muted-foreground flex items-center gap-1">
                <Layers className="h-3 w-3" />
                {section.standards.length} Standards
              </p>
            </div>
          </div>
        </div>

        {domainScore !== null && (
          <div className="text-right">
            <div className={cn(
              "text-3xl font-mono font-black",
              domainScore < 2 && "text-evidence-alert",
              domainScore >= 2 && domainScore < 3 && "text-amber-500",
              domainScore >= 3 && "text-evidence-success"
            )}>
              {domainScore.toFixed(2)}
            </div>
            <div className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Domain Score</div>
          </div>
        )}
      </div>

      {/* Standards and KPIs */}
      <div className="p-6 space-y-8">
        {section.standards.map((standard, stdIdx) => (
          <div key={standard.id} className="space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/50">
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground uppercase">
                S{stdIdx + 1}
              </div>
              <h4 className="font-bold text-sm text-foreground uppercase tracking-wide italic">{standard.name}</h4>
            </div>

            <div className="space-y-4 pl-4 border-l-2 border-muted/50">
              {standard.kpis.map((kpi, kpiIdx) => (
                <AssessmentIndicator
                  key={kpi.id}
                  indicator={kpi}
                  index={kpiIdx}
                  onChange={(updates) => onIndicatorChange(kpi.id, updates)}
                  readonly={readonly}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
