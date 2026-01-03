import { cn } from "@/lib/utils";
import { Info, Sparkles, AlertTriangle, CheckCircle, TrendingUp, Award } from "lucide-react";

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
  hideEvidenceRequirement?: boolean;
}

const defaultScoreOptions: ScoreOption[] = [
  { score: 0, label: "Critical Failure", enabled: true },
  { score: 1, label: "Below Expectations", enabled: true },
  { score: 2, label: "Meets Standard", enabled: true },
  { score: 3, label: "Exceeds Standard", enabled: true },
  { score: 4, label: "Outstanding", enabled: true },
];

const getScoreConfig = (score: number) => {
  switch (score) {
    case 0:
      return {
        bg: 'bg-score-0',
        border: 'border-score-0',
        text: 'text-white',
        glow: 'shadow-[0_0_20px_hsl(var(--score-0)/0.4)]',
        icon: AlertTriangle,
        gradient: 'from-red-500/20 to-orange-500/20'
      };
    case 1:
      return {
        bg: 'bg-score-1',
        border: 'border-score-1',
        text: 'text-white',
        glow: 'shadow-[0_0_20px_hsl(var(--score-1)/0.4)]',
        icon: AlertTriangle,
        gradient: 'from-orange-500/20 to-amber-500/20'
      };
    case 2:
      return {
        bg: 'bg-score-2',
        border: 'border-score-2',
        text: 'text-white',
        glow: 'shadow-[0_0_20px_hsl(var(--score-2)/0.4)]',
        icon: CheckCircle,
        gradient: 'from-amber-500/20 to-yellow-500/20'
      };
    case 3:
      return {
        bg: 'bg-score-3',
        border: 'border-score-3',
        text: 'text-white',
        glow: 'shadow-[0_0_20px_hsl(var(--score-3)/0.4)]',
        icon: TrendingUp,
        gradient: 'from-emerald-500/20 to-green-500/20'
      };
    case 4:
      return {
        bg: 'bg-score-4',
        border: 'border-score-4',
        text: 'text-white',
        glow: 'shadow-[0_0_25px_hsl(var(--score-4)/0.5)]',
        icon: Award,
        gradient: 'from-blue-500/20 to-cyan-500/20'
      };
    default:
      return {
        bg: 'bg-muted',
        border: 'border-border',
        text: 'text-foreground',
        glow: '',
        icon: Info,
        gradient: 'from-muted to-muted'
      };
  }
};
export function ScoreSelector({ value, onChange, disabled, scoreOptions, hideEvidenceRequirement }: ScoreSelectorProps) {
  const options = scoreOptions?.filter(o => o.enabled) || defaultScoreOptions;
  const selectedOption = options.find(o => o.score === value);
  const selectedConfig = selectedOption ? getScoreConfig(selectedOption.score) : null;

  return (
    <div className="space-y-4">
      {/* Score Buttons */}
      <div className="flex gap-3 flex-wrap">
        {options.map((option) => {
          const isSelected = value === option.score;
          const config = getScoreConfig(option.score);

          return (
            <button
              key={option.score}
              type="button"
              onClick={() => onChange(option.score)}
              disabled={disabled}
              className={cn(
                "relative group transition-all duration-300",
                disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
              )}
            >
              {/* Glow Effect */}
              {isSelected && (
                <div className={cn(
                  "absolute inset-0 rounded-xl blur-lg opacity-60 transition-opacity",
                  config.bg
                )} />
              )}

              {/* Button */}
              <div
                className={cn(
                  "relative w-14 h-14 rounded-xl border-2 flex flex-col items-center justify-center font-mono font-bold text-lg transition-all duration-300",
                  isSelected
                    ? cn(config.bg, config.border, config.text, config.glow, "scale-110")
                    : "bg-card border-border hover:border-muted-foreground/50 text-muted-foreground hover:text-foreground hover:scale-105 hover:shadow-lg"
                )}
              >
                {option.score}

                {/* Sparkle for score 4 */}
                {isSelected && option.score === 4 && (
                  <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-yellow-300 animate-pulse" />
                )}
              </div>

              {/* Tooltip */}
              <div className={cn(
                "absolute top-full mt-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-lg text-xs text-center font-medium",
                "bg-foreground text-background opacity-0 group-hover:opacity-100 transition-all duration-200 pointer-events-none z-20",
                "w-max max-w-[180px] shadow-xl"
              )}>
                {option.label}
                {/* Arrow */}
                <div className="absolute bottom-full left-1/2 -translate-x-1/2 border-4 border-transparent border-b-foreground" />
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Score Info Card */}
      {selectedOption && selectedConfig && (
        <div className={cn(
          "relative overflow-hidden rounded-xl border p-4 transition-all duration-300",
          selectedOption.score <= 1 && "bg-evidence-alert-bg border-evidence-alert-border",
          selectedOption.score === 2 && "bg-muted/50 border-border",
          selectedOption.score >= 3 && "bg-evidence-success-bg border-evidence-success-border"
        )}>
          {/* Gradient Overlay */}
          <div className={cn(
            "absolute inset-0 bg-gradient-to-r opacity-30 pointer-events-none",
            selectedConfig.gradient
          )} />

          <div className="relative flex items-start gap-3">
            <div className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              selectedOption.score <= 1 && "bg-evidence-alert/10",
              selectedOption.score === 2 && "bg-muted",
              selectedOption.score >= 3 && "bg-evidence-success/10"
            )}>
              <selectedConfig.icon className={cn(
                "h-5 w-5",
                selectedOption.score <= 1 && "text-evidence-alert",
                selectedOption.score === 2 && "text-muted-foreground",
                selectedOption.score >= 3 && "text-evidence-success"
              )} />
            </div>
            <div>
              <p className={cn(
                "font-semibold text-base",
                selectedOption.score <= 1 && "text-evidence-alert",
                selectedOption.score === 2 && "text-foreground",
                selectedOption.score >= 3 && "text-evidence-success"
              )}>
                Score {selectedOption.score}: {selectedOption.label}
              </p>
              {!hideEvidenceRequirement && (
                <p className="text-sm text-muted-foreground mt-0.5">
                  {selectedOption.score === 0 && "No evidence required for this rating"}
                  {selectedOption.score >= 1 && "Evidence required to support this rating"}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
