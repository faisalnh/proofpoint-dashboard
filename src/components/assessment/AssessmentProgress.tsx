import { ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssessmentProgressProps {
  status: string;
  className?: string;
}

export function AssessmentProgress({ status, className }: AssessmentProgressProps) {
  // Determine step number based on status
  const getStep = (s: string) => {
    switch (s) {
      case 'draft': return 1;
      case 'self_submitted': return 2;
      case 'manager_reviewed': return 3;
      case 'director_approved': return 4;
      case 'acknowledged': return 5;
      default: return 1;
    }
  };

  const currentStep = getStep(status);
  const steps = [
    { id: 1, name: 'Drafting' },
    { id: 2, name: 'Submission' },
    { id: 3, name: 'Review' },
    { id: 4, name: 'Approval' },
    { id: 5, name: 'Finalized' }
  ];

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex justify-between mb-4">
        {steps.map((step) => (
          <div key={step.id} className="flex flex-col items-center gap-2 flex-1 relative">
            {/* Connecting line */}
            {step.id < 5 && (
              <div className={cn(
                "absolute left-1/2 top-4 w-full h-0.5 -z-10",
                currentStep > step.id ? "bg-primary" : "bg-muted"
              )} />
            )}
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300",
              currentStep > step.id ? "bg-primary text-white" :
                currentStep === step.id ? "bg-primary text-white ring-4 ring-primary/20 scale-110" :
                  "bg-muted text-muted-foreground"
            )}>
              {currentStep > step.id ? <ShieldCheck className="h-4 w-4" /> : step.id}
            </div>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-tighter",
              currentStep === step.id ? "text-primary" : "text-muted-foreground"
            )}>
              {step.name}
            </span>
          </div>
        ))}
      </div>

      <div className="p-3 rounded-lg bg-primary/5 text-primary border border-primary/10 text-xs font-bold text-center">
        Current Phase: {steps.find(s => s.id === currentStep)?.name.toUpperCase()}
      </div>
    </div>
  );
}
