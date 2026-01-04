'use client';

import { useState, useEffect, Suspense } from 'react';
import ProtectedRoute from '@/components/ProtectedRoute';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Shield,
    Users,
    Search,
    Loader2,
    UserPlus,
    MoreHorizontal,
    Mail,
    Building,
    UserCheck,
    ShieldAlert,
    Settings2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api-client';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";

function AdminContent() {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        const fetchUsers = async () => {
            setLoading(true);
            // Fetch profiles with their roles and department names
            const { data, error } = await api.getProfiles();

            if (!error && data) {
                setUsers((data as any[]).map(user => ({
                    ...user,
                    roles: user.roles || ['staff'],
                    department_name: user.department_name || 'Unassigned'
                })));
            }
            setLoading(false);
        };

        fetchUsers();
    }, []);

    const filteredUsers = users.filter(u =>
        u.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const getRoleBadge = (roles: string[]) => {
        return (
            <div className="flex flex-wrap gap-1">
                {roles.map(role => (
                    <Badge
                        key={role}
                        variant={role === 'admin' ? 'default' : 'secondary'}
                        className={
                            role === 'admin' ? 'bg-rose-100 text-rose-700 border-rose-200 hover:bg-rose-100' :
                                role === 'director' ? 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-100' :
                                    role === 'manager' ? 'bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-100' :
                                        'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-50'
                        }
                    >
                        {role.charAt(0).toUpperCase() + role.slice(1)}
                    </Badge>
                ))}
            </div>
        );
    };

    return (
        <div className="max-w-7xl mx-auto py-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 w-fit text-xs font-bold uppercase tracking-wider mb-2">
                        <Shield className="h-3 w-3" />
                        Control Center
                    </div>
                    <h1 className="text-4xl font-bold tracking-tight">User Administration</h1>
                    <p className="text-muted-foreground">Manage organizational access, roles, and user profiles.</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Filter users..."
                            className="pl-10 glass-panel"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <Button className="glow-primary">
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite User
                    </Button>
                </div>
            </div>

            <div className="grid gap-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                    <Card className="glass-panel border-border/30 overflow-hidden relative group hover-glow transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Users className="h-12 w-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardDescription>Total Users</CardDescription>
                            <CardTitle className="text-3xl font-bold">{users.length}</CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="glass-panel border-border/30 overflow-hidden relative group hover-glow transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <ShieldAlert className="h-12 w-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardDescription>Admins</CardDescription>
                            <CardTitle className="text-3xl font-bold">{users.filter(u => u.roles.includes('admin')).length}</CardTitle>
                        </CardHeader>
                    </Card>

                    <Card className="glass-panel border-border/30 overflow-hidden relative group hover-glow transition-all">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Building className="h-12 w-12" />
                        </div>
                        <CardHeader className="pb-2">
                            <CardDescription>Departments</CardDescription>
                            <CardTitle className="text-3xl font-bold">
                                {new Set(users.map(u => u.department_id).filter(id => id)).size}
                            </CardTitle>
                        </CardHeader>
                    </Card>
                </div>

                {/* User Table */}
                <Card className="glass-panel border-border/30 overflow-hidden">
                    <div className="h-1 bg-gradient-to-r from-rose-500/30 via-rose-500 to-rose-500/30" />
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings2 className="h-5 w-5 text-rose-500" />
                            Organizational Access Control
                        </CardTitle>
                        <CardDescription>Comprehensive list of all registered profiles and their assigned roles</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-20">
                                <Loader2 className="h-10 w-10 animate-spin text-primary mb-4" />
                                <p className="text-muted-foreground font-medium">Indexing profiles...</p>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="text-center py-20 border border-dashed rounded-xl bg-muted/20">
                                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                                <h3 className="text-lg font-semibold">No users found</h3>
                                <p className="text-muted-foreground">We couldn't find any users matching your criteria.</p>
                            </div>
                        ) : (
                            <div className="rounded-md border border-border/50 overflow-hidden">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            <TableHead className="w-[300px]">User</TableHead>
                                            <TableHead>Department</TableHead>
                                            <TableHead>Roles</TableHead>
                                            <TableHead className="text-right">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredUsers.map((user) => (
                                            <TableRow key={user.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-medium">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">
                                                            {user.full_name?.charAt(0) || <UserCheck className="h-5 w-5" />}
                                                        </div>
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-foreground">{user.full_name}</span>
                                                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                                                                <Mail className="h-3 w-3" />
                                                                {user.email}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-sm text-foreground italic">
                                                        <Building className="h-4 w-4 text-muted-foreground" />
                                                        {user.department_name}
                                                    </div>
                                                </TableCell>
                                                <TableCell>{getRoleBadge(user.roles)}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" className="h-8 w-8 p-0">
                                                                <span className="sr-only">Open menu</span>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" className="glass-panel-strong w-48 p-1">
                                                            <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">User Options</DropdownMenuLabel>
                                                            <DropdownMenuItem className="cursor-pointer rounded-md">Edit Profile</DropdownMenuItem>
                                                            <DropdownMenuItem className="cursor-pointer rounded-md">Assign Department</DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-border/50" />
                                                            <DropdownMenuLabel className="text-xs font-bold uppercase tracking-wider text-rose-500">Privileges</DropdownMenuLabel>
                                                            <DropdownMenuItem className="cursor-pointer rounded-md">Manage Roles</DropdownMenuItem>
                                                            <DropdownMenuSeparator className="bg-border/50" />
                                                            <DropdownMenuItem className="text-rose-500 focus:text-rose-500 focus:bg-rose-500/10 cursor-pointer rounded-md font-semibold">
                                                                Suspend Account
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default function AdminPage() {
    return (
        <ProtectedRoute requiredRoles={['admin']}>
            <div className="min-h-screen bg-background relative">
                <div className="fixed inset-0 grid-pattern opacity-50 pointer-events-none" />
                <Header />
                <main className="container relative px-4 py-8">
                    <Suspense fallback={<Loader2 className="h-12 w-12 animate-spin text-primary fixed top-1/2 left-1/2" />}>
                        <AdminContent />
                    </Suspense>
                </main>
            </div>
        </ProtectedRoute>
    );
}
