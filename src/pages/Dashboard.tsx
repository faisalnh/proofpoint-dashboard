import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { 
  ClipboardList, 
  Users, 
  Building2, 
  FileText, 
  Settings,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertCircle
} from 'lucide-react';

interface Assessment {
  id: string;
  period: string;
  status: string;
  created_at: string;
}

export default function Dashboard() {
  const { profile, roles, isAdmin, isManager, isDirector, signOut } = useAuth();
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssessments = async () => {
      const { data } = await supabase
        .from('assessments')
        .select('id, period, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (data) {
        setAssessments(data);
      }
      setLoading(false);
    };

    fetchAssessments();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="outline" className="text-muted-foreground"><Clock className="h-3 w-3 mr-1" /> Draft</Badge>;
      case 'self_submitted':
        return <Badge className="bg-primary/20 text-primary"><ChevronRight className="h-3 w-3 mr-1" /> Submitted</Badge>;
      case 'manager_reviewed':
        return <Badge className="bg-evidence-success/20 text-evidence-success"><CheckCircle2 className="h-3 w-3 mr-1" /> Reviewed</Badge>;
      case 'director_approved':
        return <Badge className="bg-green-500/20 text-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" /> Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const roleLabels = roles.map(role => {
    switch (role) {
      case 'admin': return 'Administrator';
      case 'manager': return 'Manager';
      case 'director': return 'Director';
      case 'staff': return 'Staff';
      default: return role;
    }
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight">
            Welcome back, {profile?.full_name || 'User'}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            {roleLabels.map(role => (
              <Badge key={role} variant="secondary">{role}</Badge>
            ))}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {/* Self Assessment Card */}
          <Card className="border-border/50 hover:border-primary/30 transition-colors">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5 text-primary" />
                Self Assessment
              </CardTitle>
              <CardDescription>Complete your performance evaluation</CardDescription>
            </CardHeader>
            <CardContent>
              <Link to="/assessment">
                <Button className="w-full">Start Assessment</Button>
              </Link>
            </CardContent>
          </Card>

          {/* Manager Dashboard */}
          {(isManager || isAdmin) && (
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Team Dashboard
                </CardTitle>
                <CardDescription>Review your team's assessments</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/manager">
                  <Button variant="outline" className="w-full">View Team</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Director Dashboard */}
          {(isDirector || isAdmin) && (
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Director Overview
                </CardTitle>
                <CardDescription>Approve and oversee all departments</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/director">
                  <Button variant="outline" className="w-full">View Organization</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Rubric Management */}
          {(isManager || isDirector || isAdmin) && (
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" />
                  Rubric Templates
                </CardTitle>
                <CardDescription>Create and manage evaluation criteria</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/rubrics">
                  <Button variant="outline" className="w-full">Manage Rubrics</Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Admin Panel */}
          {isAdmin && (
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-primary" />
                  Admin Panel
                </CardTitle>
                <CardDescription>Manage users, roles, and departments</CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/admin">
                  <Button variant="outline" className="w-full">Open Admin</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Assessments */}
        <Card className="mt-8 border-border/50">
          <CardHeader>
            <CardTitle>Recent Assessments</CardTitle>
            <CardDescription>Your latest performance evaluations</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-muted-foreground">Loading...</p>
            ) : assessments.length === 0 ? (
              <p className="text-muted-foreground">No assessments yet. Start your first one!</p>
            ) : (
              <div className="space-y-3">
                {assessments.map(assessment => (
                  <div 
                    key={assessment.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="font-medium">{assessment.period}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(assessment.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {getStatusBadge(assessment.status)}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 flex justify-end">
          <Button variant="ghost" onClick={signOut}>
            Sign Out
          </Button>
        </div>
      </main>
    </div>
  );
}
