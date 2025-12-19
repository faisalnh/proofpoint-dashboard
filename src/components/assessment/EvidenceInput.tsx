import { useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { AlertCircle, Plus, Trash2, Link, FileText, Upload, Loader2, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";

export interface EvidenceItem {
  evidence: string;
  notes: string;
  type?: "link" | "file";
  fileName?: string;
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
    return value.length > 0 ? value : [{ evidence: "", notes: "", type: "link" }];
  }
  // Legacy string format - convert to new format
  if (typeof value === "string" && value.trim()) {
    return [{ evidence: value, notes: "", type: "link" }];
  }
  return [{ evidence: "", notes: "", type: "link" }];
}

function isEvidenceRequired(score: number | null): boolean {
  // Evidence required for scores 1-4
  return score !== null && score >= 1;
}

function hasMinimumEvidence(items: EvidenceItem[]): boolean {
  return items.some(item => item.evidence.trim().length > 0);
}

export function EvidenceInput({ score, value, onChange, disabled }: EvidenceInputProps) {
  const { user } = useAuth();
  const items = parseEvidenceValue(value);
  const required = isEvidenceRequired(score);
  const hasEvidence = hasMinimumEvidence(items);
  const showWarning = required && !hasEvidence && score !== null;
  const [uploadingIndex, setUploadingIndex] = useState<number | null>(null);
  const fileInputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const updateItem = (index: number, field: keyof EvidenceItem, val: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: val };
    if (field === "evidence" && !newItems[index].type) {
      newItems[index].type = "link";
    }
    onChange(newItems);
  };

  const addItem = () => {
    onChange([...items, { evidence: "", notes: "", type: "link" }]);
  };

  const removeItem = (index: number) => {
    if (items.length > 1) {
      const newItems = items.filter((_, i) => i !== index);
      onChange(newItems);
    }
  };

  const handleFileUpload = async (index: number, file: File) => {
    if (!user) {
      toast({ title: "Error", description: "You must be logged in to upload files", variant: "destructive" });
      return;
    }

    setUploadingIndex(index);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { data, error } = await supabase.storage
        .from('evidence')
        .upload(filePath, file);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('evidence')
        .getPublicUrl(filePath);

      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        evidence: urlData.publicUrl,
        type: "file",
        fileName: file.name
      };
      onChange(newItems);
      
      toast({ title: "Success", description: "File uploaded successfully" });
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    } finally {
      setUploadingIndex(null);
    }
  };

  const triggerFileInput = (index: number) => {
    fileInputRefs.current[index]?.click();
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
                Evidence (Link or File)
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
                
                {/* Evidence Input with File Upload */}
                <div className="space-y-2">
                  {/* Show uploaded file info if exists */}
                  {item.type === "file" && item.fileName && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted rounded-md text-sm">
                      <FileText className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate flex-1">{item.fileName}</span>
                      <a 
                        href={item.evidence} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-primary hover:text-primary/80"
                        title="Open file"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  )}
                  
                  {/* Always show link input and upload button */}
                  <div className="flex gap-2">
                    <Input
                      value={item.type === "file" ? "" : item.evidence}
                      onChange={(e) => {
                        const newItems = [...items];
                        newItems[index] = { 
                          ...newItems[index], 
                          evidence: e.target.value,
                          type: "link",
                          fileName: undefined
                        };
                        onChange(newItems);
                      }}
                      placeholder={item.type === "file" ? "Or paste a different link..." : "Paste link here..."}
                      disabled={isDisabled || uploadingIndex === index}
                      className={cn(
                        "h-9 flex-1",
                        showWarning && !item.evidence.trim() && "border-evidence-alert"
                      )}
                    />
                    <input
                      type="file"
                      ref={(el) => { fileInputRefs.current[index] = el; }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(index, file);
                        e.target.value = '';
                      }}
                      className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.txt"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => triggerFileInput(index)}
                      disabled={isDisabled || uploadingIndex === index}
                      className="h-9 w-9 shrink-0"
                      title={item.type === "file" ? "Replace file" : "Upload file"}
                    >
                      {uploadingIndex === index ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
                
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
          <span className="font-medium">At least 1 evidence required.</span> Paste a link or upload a file to submit.
        </div>
      )}
    </div>
  );
}
