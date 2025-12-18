import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Activity, User, Settings, LogOut, ClipboardList, Users, Building2, FileText, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useAuth } from "@/hooks/useAuth";

interface HeaderProps {
  className?: string;
}

export function Header({ className }: HeaderProps) {
  const location = useLocation();
  const { user, profile, isAdmin, isManager, isDirector, signOut } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className={cn(
      "h-16 border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50",
      className
    )}>
      <div className="container h-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary">
            <Activity className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-foreground">ProofPoint</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground -mt-0.5">
              Performance OS
            </p>
          </div>
        </Link>
        
        {/* Nav */}
        {user && (
          <nav className="hidden md:flex items-center gap-1">
            <Link to="/assessment">
              <Button 
                variant="ghost" 
                size="sm" 
                className={cn(
                  "gap-2",
                  isActive('/assessment') ? "text-primary font-medium" : "text-muted-foreground"
                )}
              >
                <ClipboardList className="h-4 w-4" />
                Self-Assessment
              </Button>
            </Link>
            
            {(isManager || isAdmin) && (
              <Link to="/manager">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "gap-2",
                    isActive('/manager') ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <Users className="h-4 w-4" />
                  Team
                </Button>
              </Link>
            )}
            
            {(isDirector || isAdmin) && (
              <Link to="/director">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "gap-2",
                    isActive('/director') ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  Organization
                </Button>
              </Link>
            )}
            
            {(isManager || isDirector || isAdmin) && (
              <Link to="/rubrics">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "gap-2",
                    isActive('/rubrics') ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <FileText className="h-4 w-4" />
                  Rubrics
                </Button>
              </Link>
            )}
            
            {isAdmin && (
              <Link to="/admin">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className={cn(
                    "gap-2",
                    isActive('/admin') ? "text-primary font-medium" : "text-muted-foreground"
                  )}
                >
                  <Shield className="h-4 w-4" />
                  Admin
                </Button>
              </Link>
            )}
          </nav>
        )}
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{profile?.full_name || 'User'}</p>
                  <p className="text-xs text-muted-foreground">{profile?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/dashboard" className="cursor-pointer">
                    <Settings className="h-4 w-4 mr-2" />
                    Dashboard
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="cursor-pointer text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="outline" size="sm">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
