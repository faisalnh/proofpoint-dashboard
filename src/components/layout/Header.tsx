import { cn } from "@/lib/utils";
import { Activity, User, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  return (
    <header className={cn(
      "h-16 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50",
      className
    )}>
      <div className="container h-full flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">ProofPoint</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">
              Performance OS
            </p>
          </div>
        </div>
        
        {/* Nav */}
        <nav className="hidden md:flex items-center gap-1">
          <Button variant="ghost" size="sm" className="text-primary font-medium">
            Self-Assessment
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            Reports
          </Button>
          <Button variant="ghost" size="sm" className="text-muted-foreground">
            History
          </Button>
        </nav>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <Settings className="h-5 w-5" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground">
            <User className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
