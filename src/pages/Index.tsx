import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { Activity, ArrowRight, Shield, BarChart3, Users, FileCheck, LogIn } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border))_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border))_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        
        <div className="container relative pt-20 pb-24">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary shadow-lg shadow-primary/20">
              <Activity className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground">ProofPoint</h1>
              <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                The Modern Performance OS
              </p>
            </div>
          </div>

          {/* Hero Content */}
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6">
              <Shield className="h-4 w-4" />
              Bias-Free Appraisals
            </div>
            
            <h2 className="text-5xl md:text-6xl font-bold text-foreground tracking-tight leading-[1.1] mb-6">
              No Evidence,
              <br />
              <span className="text-primary">No Score.</span>
            </h2>
            
            <p className="text-xl text-muted-foreground leading-relaxed mb-8 max-w-2xl">
              ProofPoint revolutionizes employee appraisals with a data-driven approach. 
              Every rating requires documentation. Every score is justified. 
              No more subjective bias.
            </p>

            <div className="flex flex-col sm:flex-row gap-4">
              {user ? (
                <Button 
                  size="lg" 
                  onClick={() => navigate("/dashboard")}
                  className="text-base px-6"
                >
                  Go to Dashboard
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              ) : (
                <>
                  <Button 
                    size="lg" 
                    onClick={() => navigate("/auth")}
                    className="text-base px-6"
                  >
                    Get Started
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="lg"
                    onClick={() => navigate("/auth")}
                    className="text-base px-6"
                  >
                    <LogIn className="mr-2 h-5 w-5" />
                    Sign In
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div className="border-t bg-card/50">
        <div className="container py-20">
          <div className="text-center mb-12">
            <h3 className="text-sm font-medium text-primary uppercase tracking-wider mb-2">
              Command Center
            </h3>
            <p className="text-2xl font-semibold text-foreground">
              Enterprise-grade performance management
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: BarChart3,
                title: "Real-Time Scoring",
                description: "Watch weighted scores calculate instantly as you rate. Section weights and letter grades update live."
              },
              {
                icon: Shield,
                title: "Evidence-Based",
                description: "Smart input validation ensures every non-standard rating has documented proof. No shortcuts."
              },
              {
                icon: Users,
                title: "Role-Based Flow",
                description: "Staff self-assess, managers review side-by-side, directors approve. Clear accountability chain."
              }
            ].map((feature, i) => (
              <div 
                key={i}
                className="group p-6 rounded-xl border bg-card hover:shadow-lg hover:border-primary/20 transition-all duration-300"
              >
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h4 className="font-semibold text-foreground mb-2">{feature.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="border-t">
        <div className="container py-16">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 p-8 rounded-2xl bg-primary/5 border border-primary/10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-xl bg-primary flex items-center justify-center">
                <FileCheck className="h-7 w-7 text-primary-foreground" />
              </div>
              <div>
                <h4 className="font-semibold text-foreground text-lg">Ready to prove your performance?</h4>
                <p className="text-muted-foreground">Start your Q4 2024 self-assessment now</p>
              </div>
            </div>
            <Button 
              size="lg" 
              onClick={() => navigate(user ? "/dashboard" : "/auth")}
            >
              {user ? "Go to Dashboard" : "Get Started"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <span>ProofPoint Performance OS</span>
          </div>
          <div>
            © 2024 All rights reserved
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
