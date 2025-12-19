import { Check, FileText, UserCheck, User, Building, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCurrentStep, getStatusInfo } from "@/lib/assessmentStatus";

interface Step {
  label: string;
  icon: React.ElementType;
  description?: string;
}

const STEPS: Step[] = [
  { label: "Staff Assessment", icon: FileText, description: "Self-evaluation" },
  { label: "Manager Appraisal", icon: UserCheck, description: "Review & scoring" },
  { label: "Director Approval", icon: Building, description: "Final sign-off" },
  { label: "Staff Acknowledged", icon: User, description: "Accept or raise questions" },
];

interface AssessmentProgressProps {
  status: string;
  hasQuestions?: boolean;
  className?: string;
}

export function AssessmentProgress({ status, hasQuestions = false, className }: AssessmentProgressProps) {
  const currentStep = getCurrentStep(status);
  const statusInfo = getStatusInfo(status);
  
  // Special case: if rejected, highlight that
  const isRejected = status === 'rejected';
  
  return (
    <div className={cn("w-full", className)}>
      {/* Progress Steps */}
      <div className="flex items-center justify-between relative">
        {/* Connecting Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-border" />
        <div 
          className="absolute top-5 left-0 h-0.5 bg-primary transition-all duration-300"
          style={{ width: `${Math.max(0, (currentStep - 1) / (STEPS.length - 1) * 100)}%` }}
        />
        
        {STEPS.map((step, index) => {
          const stepNumber = index + 1;
          const isComplete = currentStep > stepNumber;
          const isCurrent = currentStep === stepNumber;
          const Icon = step.icon;
          
          // Check if this is step 3 and there are questions
          const showQuestionIndicator = stepNumber === 3 && hasQuestions && isCurrent;
          
          return (
            <div key={step.label} className="flex flex-col items-center relative z-10">
              {/* Step Circle */}
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-200",
                  isComplete && "bg-primary border-primary text-primary-foreground",
                  isCurrent && !isRejected && "bg-primary/10 border-primary text-primary",
                  isCurrent && isRejected && "bg-destructive/10 border-destructive text-destructive",
                  !isComplete && !isCurrent && "bg-background border-muted-foreground/30 text-muted-foreground"
                )}
              >
                {isComplete ? (
                  <Check className="h-5 w-5" />
                ) : showQuestionIndicator ? (
                  <MessageSquare className="h-5 w-5" />
                ) : (
                  <Icon className="h-5 w-5" />
                )}
              </div>
              
              {/* Label */}
              <span
                className={cn(
                  "mt-2 text-xs font-medium text-center max-w-[80px]",
                  isComplete && "text-primary",
                  isCurrent && !isRejected && "text-primary",
                  isCurrent && isRejected && "text-destructive",
                  !isComplete && !isCurrent && "text-muted-foreground"
                )}
              >
                {showQuestionIndicator ? "Question Raised" : step.label}
              </span>
            </div>
          );
        })}
      </div>
      
      {/* Current Status Label */}
      <div className="mt-4 text-center">
        <p className={cn(
          "text-sm font-medium",
          isRejected ? "text-destructive" : "text-foreground"
        )}>
          {statusInfo.label}
        </p>
        <p className="text-xs text-muted-foreground">{statusInfo.description}</p>
      </div>
    </div>
  );
}
