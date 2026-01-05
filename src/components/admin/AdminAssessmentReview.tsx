
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, FileText, Loader2, User, Building, Eye } from 'lucide-react';
import { api } from '@/lib/api-client';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

interface AdminAssessmentReviewProps {
    // No props needed for now as it fetches its own data
}

interface Assessment {
    id: string;
    status: string;
    manager_scores: any;
    final_score: number | null;
    final_grade: string | null;
    created_at: string;
    updated_at: string;
    staff_name: string;
    staff_department: string;
    manager_name: string;
    director_name: string;
}

export function AdminAssessmentReview() {
    const { toast } = useToast();
    const [assessments, setAssessments] = useState<Assessment[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchAssessments = async () => {
        setLoading(true);
        // Fetch assessments. We might want to filter by status or fetch all pending ones
        // In a real app, we'd have pagination and filtering. 
        // For now, let's fetch everything and filter client-side if needed, relying on API default.
        const { data, error } = await api.get('/api/admin/assessments');

        if (error) {
            toast({
                title: "Error",
                description: "Failed to fetch assessments",
                variant: "destructive"
            });
        } else if (data) {
            const pendingAssessments = (data as Assessment[]).filter(
                a => a.status === 'director_approved'
            );
            setAssessments(pendingAssessments);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchAssessments();
    }, []);

    const handleRelease = async (id: string) => {
        setProcessingId(id);
        const { data, error } = await api.put('/api/admin/assessments', {
            id,
            action: 'release'
        });

        if (error) {
            toast({
                title: "Error",
                description: "Failed to release assessment",
                variant: "destructive"
            });
        } else {
            toast({
                title: "Success",
                description: "Assessment released successfully. Workflow can now proceed to acknowledgment.",
            });
            // Refresh list
            fetchAssessments();
        }
        setProcessingId(null);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'director_approved':
                return <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 border-emerald-200">Pending Release</Badge>;
            case 'admin_reviewed':
                return <Badge variant="secondary" className="bg-blue-100 text-blue-800 border-blue-200">Released</Badge>;
            case 'acknowledged':
                return <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">Acknowledged</Badge>;
            default:
                return <Badge variant="outline">{status}</Badge>;
        }
    };

    return (
        <Card className="glass-panel border-border/30 overflow-hidden">
            <div className="h-1 bg-gradient-to-r from-blue-500/30 via-blue-500 to-blue-500/30" />
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="flex items-center gap-2">
                            <FileText className="h-5 w-5 text-blue-500" />
                            Assessment Reviews
                        </CardTitle>
                        <CardDescription>Review and release finalized assessments.</CardDescription>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchAssessments} disabled={loading}>
                        Refresh
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                        <p className="text-muted-foreground font-medium">Loading assessments...</p>
                    </div>
                ) : assessments.length === 0 ? (
                    <div className="text-center py-20 border border-dashed rounded-xl bg-muted/20">
                        <CheckCircle2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                        <h3 className="text-lg font-semibold">All Caught Up</h3>
                        <p className="text-muted-foreground">No assessments pending review.</p>
                    </div>
                ) : (
                    <div className="rounded-md border border-border/50 overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/50">
                                <TableRow>
                                    <TableHead>Staff Member</TableHead>
                                    <TableHead>Department</TableHead>
                                    <TableHead>Score</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {assessments.map((assessment) => (
                                    <TableRow key={assessment.id} className="hover:bg-muted/30 transition-colors">
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xs font-bold">
                                                    {assessment.staff_name?.charAt(0)}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span>{assessment.staff_name}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2 text-sm">
                                                <Building className="h-3 w-3 text-muted-foreground" />
                                                {assessment.staff_department}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-bold">{assessment.final_score ?? '-'}</span>
                                                <span className="text-xs text-muted-foreground">{assessment.final_grade ?? '-'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">
                                            {format(new Date(assessment.updated_at), 'MMM d, yyyy')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {assessment.status === 'director_approved' && (
                                                <Button
                                                    size="sm"
                                                    className="glow-primary"
                                                    onClick={() => handleRelease(assessment.id)}
                                                    disabled={processingId === assessment.id}
                                                >
                                                    {processingId === assessment.id ? (
                                                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                    ) : (
                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                    )}
                                                    Release
                                                </Button>
                                            )}
                                            {assessment.status === 'admin_reviewed' && (
                                                <span className="text-xs text-muted-foreground italic">Released</span>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
