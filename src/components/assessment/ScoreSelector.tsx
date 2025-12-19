import { cn } from "@/lib/utils";
import { Info } from "lucide-react";

interface ScoreOption {
  score: number;
  label: string;
  enabled: boolean;
}

interface ScoreSelectorProps {
  value: number | null;
  onChange: (score: number) => void;
  disabled?: boolean;
  scoreOptions?: ScoreOption[];
}

const defaultScoreOptions: ScoreOption[] = [
  { score: 0, label: "Critical Failure", enabled: true },
  { score: 1, label: "Below Expectations", enabled: true },
  { score: 2, label: "Meets Standard", enabled: true },
  { score: 3, label: "Exceeds Standard", enabled: true },
  { score: 4, label: "Outstanding", enabled: true },
];

export function ScoreSelector({ value, onChange, disabled, scoreOptions }: ScoreSelectorProps) {
  const options = scoreOptions?.filter(o => o.enabled) || defaultScoreOptions;
  const selectedOption = options.find(o => o.score === value);
  
  return (
    <div className="space-y-3">
      <div className="flex gap-2 flex-wrap">
        {options.map((option) => {
          const isSelected = value === option.score;
          
          return (
            <button
              key={option.score}
              type="button"
              onClick={() => onChange(option.score)}
              disabled={disabled}
              className={cn(
                "relative group flex flex-col items-center gap-1 transition-all duration-200",
                disabled && "opacity-50 cursor-not-allowed"
              )}
            >
              <div
                className={cn(
                  "score-indicator border-2 transition-all duration-200",
                  isSelected && option.score <= 1 && "bg-evidence-alert border-evidence-alert text-evidence-alert-foreground scale-110 shadow-lg",
                  isSelected && option.score === 2 && "bg-muted-foreground border-muted-foreground text-background scale-110 shadow-lg",
                  isSelected && option.score >= 3 && "bg-evidence-success border-evidence-success text-evidence-success-foreground scale-110 shadow-lg",
                  !isSelected && "bg-card border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground"
                )}
              >
                {option.score}
              </div>
              
              <div className={cn(
                "absolute top-full mt-2 left-1/2 -translate-x-1/2 px-2 py-1 rounded text-xs text-center",
                "bg-foreground text-background opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none z-10",
                "w-max max-w-[200px]"
              )}>
                {option.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected score info */}
      {selectedOption && (
        <div className={cn(
          "flex items-start gap-2 p-3 rounded-lg text-sm",
          selectedOption.score <= 1 && "bg-evidence-alert-bg border border-evidence-alert-border",
          selectedOption.score === 2 && "bg-muted border border-border",
          selectedOption.score >= 3 && "bg-evidence-success-bg border border-evidence-success-border"
        )}>
          <Info className={cn(
            "h-4 w-4 mt-0.5 shrink-0",
            selectedOption.score <= 1 && "text-evidence-alert",
            selectedOption.score === 2 && "text-muted-foreground",
            selectedOption.score >= 3 && "text-evidence-success"
          )} />
          <div>
            <span className={cn(
              "font-medium",
              selectedOption.score <= 1 && "text-evidence-alert",
              selectedOption.score === 2 && "text-foreground",
              selectedOption.score >= 3 && "text-evidence-success"
            )}>
              Score {selectedOption.score}: {selectedOption.label}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
