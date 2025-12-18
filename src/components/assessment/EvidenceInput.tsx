import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Award, FileText } from "lucide-react";

type EvidenceState = "alert" | "neutral" | "success";

interface EvidenceInputProps {
  score: number | null;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function getEvidenceState(score: number | null): EvidenceState {
  if (score === null) return "neutral";
  if (score <= 1) return "alert";
  if (score >= 3) return "success";
  return "neutral";
}

function getPlaceholder(state: EvidenceState): string {
  switch (state) {
    case "alert":
      return "⚠️ REQUIRED: Describe the specific incident, failure date, or performance gap that justifies this score...";
    case "success":
      return "✓ REQUIRED: Paste link to evidence, portfolio item, achievement documentation, or specific accomplishment details...";
    default:
      return "Optional: Add any additional context or notes for this standard rating...";
  }
}

function getRequirementLabel(state: EvidenceState): { text: string; required: boolean } {
  switch (state) {
    case "alert":
      return { text: "Evidence Required", required: true };
    case "success":
      return { text: "Evidence Required", required: true };
    default:
      return { text: "Optional", required: false };
  }
}

export function EvidenceInput({ score, value, onChange, disabled }: EvidenceInputProps) {
  const state = getEvidenceState(score);
  const placeholder = getPlaceholder(state);
  const requirement = getRequirementLabel(state);
  
  const Icon = state === "alert" ? AlertCircle : state === "success" ? Award : FileText;

  return (
    <div className={cn(
      "relative rounded-lg border-2 transition-all duration-300",
      state === "alert" && "border-evidence-alert bg-evidence-alert-bg",
      state === "success" && "border-evidence-success bg-evidence-success-bg",
      state === "neutral" && "border-evidence-neutral-border bg-evidence-neutral"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b transition-colors duration-300",
        state === "alert" && "border-evidence-alert-border",
        state === "success" && "border-evidence-success-border",
        state === "neutral" && "border-evidence-neutral-border"
      )}>
        <div className="flex items-center gap-2">
          <Icon className={cn(
            "h-4 w-4",
            state === "alert" && "text-evidence-alert",
            state === "success" && "text-evidence-success",
            state === "neutral" && "text-muted-foreground"
          )} />
          <span className={cn(
            "text-sm font-medium",
            state === "alert" && "text-evidence-alert",
            state === "success" && "text-evidence-success",
            state === "neutral" && "text-muted-foreground"
          )}>
            Supporting Evidence
          </span>
        </div>
        
        <span className={cn(
          "text-xs font-mono px-2 py-0.5 rounded-full",
          requirement.required && state === "alert" && "bg-evidence-alert text-evidence-alert-foreground",
          requirement.required && state === "success" && "bg-evidence-success text-evidence-success-foreground",
          !requirement.required && "bg-muted text-muted-foreground"
        )}>
          {requirement.text}
        </span>
      </div>
      
      {/* Textarea */}
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled || score === null}
        className={cn(
          "border-0 bg-transparent resize-none min-h-[100px] focus-visible:ring-0 focus-visible:ring-offset-0",
          "placeholder:text-muted-foreground/70",
          score === null && "opacity-50"
        )}
      />
      
      {/* Footer hint */}
      {score !== null && requirement.required && value.trim().length === 0 && (
        <div className={cn(
          "px-3 py-2 text-xs border-t",
          state === "alert" && "border-evidence-alert-border text-evidence-alert",
          state === "success" && "border-evidence-success-border text-evidence-success"
        )}>
          <span className="font-medium">No Evidence, No Score.</span> This field must be completed to submit.
        </div>
      )}
    </div>
  );
}
