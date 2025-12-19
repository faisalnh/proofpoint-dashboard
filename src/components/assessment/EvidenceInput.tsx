import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Trash2, Link, FileText } from "lucide-react";

export interface EvidenceItem {
  evidence: string;
  notes: string;
}

interface EvidenceInputProps {
  score: number | null;
  value: string | EvidenceItem[];
  onChange: (value: EvidenceItem[]) => void;
  disabled?: boolean;
}

// Parse legacy string value or return array as-is
function parseEvidenceValue(value: string | EvidenceItem[]): EvidenceItem[] {
  if (Array.isArray(value)) {
    return value.length > 0 ? value : [{ evidence: "", notes: "" }];
  }
  // Legacy string format - convert to new format
  if (typeof value === "string" && value.trim()) {
    return [{ evidence: value, notes: "" }];
  }
  return [{ evidence: "", notes: "" }];
}

function isEvidenceRequired(score: number | null): boolean {
  // Evidence required for scores 1-4
  return score !== null && score >= 1;
}

function hasMinimumEvidence(items: EvidenceItem[]): boolean {
  return items.some(item => item.evidence.trim().length > 0);
}

export function EvidenceInput({ score, value, onChange, disabled }: EvidenceInputProps) {
  const items = parseEvidenceValue(value);
  const required = isEvidenceRequired(score);
  const hasEvidence = hasMinimumEvidence(items);
  const showWarning = required && !hasEvidence && score !== null;

  const updateItem = (index: number, field: keyof EvidenceItem, val: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: val };
    onChange(newItems);
  };

  const addItem = () => {
    onChange([...items, { evidence: "", notes: "" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
    }
  };

  const isDisabled = disabled || score === null || score === 0;

  return (
    <div className={cn(
      "relative rounded-lg border-2 transition-all duration-300",
      showWarning ? "border-evidence-alert bg-evidence-alert-bg" : "border-border bg-card"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center justify-between px-3 py-2 border-b transition-colors duration-300",
        showWarning ? "border-evidence-alert-border" : "border-border"
      )}>
        <div className="flex items-center gap-2">
          {showWarning ? (
            <AlertCircle className="h-4 w-4 text-evidence-alert" />
          ) : (
            <FileText className="h-4 w-4 text-muted-foreground" />
          )}
          <span className={cn(
            "text-sm font-medium",
            showWarning ? "text-evidence-alert" : "text-muted-foreground"
          )}>
            Supporting Evidence
          </span>
        </div>
        
        <span className={cn(
          "text-xs font-mono px-2 py-0.5 rounded-full",
          required ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
        )}>
          {required ? "Required" : "N/A"}
        </span>
      </div>
      
      {/* Evidence Items */}
      <div className="p-3 space-y-3">
        {score === 0 ? (
          <p className="text-sm text-muted-foreground italic py-2">
            Evidence not required for score 0 (Critical Failure)
          </p>
        ) : score === null ? (
          <p className="text-sm text-muted-foreground italic py-2 opacity-50">
            Select a score to add evidence
          </p>
        ) : (
          <>
            {/* Table Header */}
            <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 text-xs font-medium text-muted-foreground px-1">
              <span>#</span>
              <span className="flex items-center gap-1">
                <Link className="h-3 w-3" /> Evidence (Link or File)
              </span>
              <span>Notes</span>
              <span></span>
            </div>

            {/* Evidence Rows */}
            {items.map((item, index) => (
              <div 
                key={index}
                className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-start"
              >
                <span className="flex items-center justify-center h-9 text-sm font-mono text-muted-foreground">
                  {index + 1}
                </span>
                <Input
                  value={item.evidence}
                  onChange={(e) => updateItem(index, "evidence", e.target.value)}
                  placeholder="Paste link or describe file..."
                  disabled={isDisabled}
                  className={cn(
                    "h-9",
                    showWarning && !item.evidence.trim() && "border-evidence-alert"
                  )}
                />
                <Textarea
                  value={item.notes}
                  onChange={(e) => updateItem(index, "notes", e.target.value)}
                  placeholder="Additional notes..."
                  disabled={isDisabled}
                  className="min-h-[36px] h-9 resize-none py-2"
                  rows={1}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeItem(index)}
                  disabled={isDisabled || items.length <= 1}
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}

            {/* Add Button */}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addItem}
              disabled={isDisabled}
              className="w-full mt-2"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Evidence
            </Button>
          </>
        )}
      </div>
      
      {/* Footer warning */}
      {showWarning && (
        <div className="px-3 py-2 text-xs border-t border-evidence-alert-border text-evidence-alert">
          <span className="font-medium">At least 1 evidence required.</span> Add a link or file reference to submit.
        </div>
      )}
    </div>
  );
}
