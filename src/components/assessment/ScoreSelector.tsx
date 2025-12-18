import { cn } from "@/lib/utils";

interface ScoreSelectorProps {
  value: number | null;
  onChange: (score: number) => void;
  disabled?: boolean;
}

const scoreLabels: Record<number, { label: string; description: string }> = {
  0: { label: "0", description: "Critical Failure" },
  1: { label: "1", description: "Below Expectations" },
  2: { label: "2", description: "Meets Standard" },
  3: { label: "3", description: "Exceeds Standard" },
  4: { label: "4", description: "Outstanding" },
};

export function ScoreSelector({ value, onChange, disabled }: ScoreSelectorProps) {
  return (
    <div className="flex gap-2">
      {[0, 1, 2, 3, 4].map((score) => {
        const isSelected = value === score;
        const scoreConfig = scoreLabels[score];
        
        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            disabled={disabled}
            className={cn(
              "relative group flex flex-col items-center gap-1 transition-all duration-200",
              disabled && "opacity-50 cursor-not-allowed"
            )}
          >
            <div
              className={cn(
                "score-indicator border-2 transition-all duration-200",
                isSelected && score <= 1 && "bg-evidence-alert border-evidence-alert text-evidence-alert-foreground scale-110 shadow-lg",
                isSelected && score === 2 && "bg-muted-foreground border-muted-foreground text-background scale-110 shadow-lg",
                isSelected && score >= 3 && "bg-evidence-success border-evidence-success text-evidence-success-foreground scale-110 shadow-lg",
                !isSelected && "bg-card border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {score}
            </div>
            
            {/* Tooltip on hover */}
            <div className={cn(
              "absolute -bottom-8 left-1/2 -translate-x-1/2 whitespace-nowrap px-2 py-1 rounded text-xs",
              "bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10"
            )}>
              {scoreConfig.description}
            </div>
          </button>
        );
      })}
    </div>
  );
}
