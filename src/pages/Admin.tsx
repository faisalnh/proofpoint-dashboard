import { useEffect, useState } from 'react';
import { Header } from '@/components/layout/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Building2, 
  Plus,
  Pencil,
  Trash2,
  ChevronRight,
  Loader2
} from 'lucide-react';

type AppRole = 'admin' | 'staff' | 'manager' | 'director';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  department_id: string | null;
}

interface UserRole {
  id: string;
  user_id: string;
  role: AppRole;
}

interface Department {
  id: string;
  name: string;
  parent_id: string | null;
}

export default function Admin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptParent, setNewDeptParent] = useState<string | null>(null);
  const [isAddingDept, setIsAddingDept] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<Profile | null>(null);
  const [selectedRole, setSelectedRole] = useState<AppRole>('staff');
  const [selectedDept, setSelectedDept] = useState<string | null>(null);
  const [isEditingUser, setIsEditingUser] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    
    const [profilesRes, rolesRes, deptsRes] = await Promise.all([
      supabase.from('profiles').select('*'),
      supabase.from('user_roles').select('*'),
      supabase.from('departments').select('*').order('name')
    ]);
    
    if (profilesRes.data) setProfiles(profilesRes.data as Profile[]);
    if (rolesRes.data) setUserRoles(rolesRes.data as UserRole[]);
    if (deptsRes.data) setDepartments(deptsRes.data as Department[]);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const getUserRoles = (userId: string): AppRole[] => {
    return userRoles
      .filter(r => r.user_id === userId)
      .map(r => r.role);
  };

  const getDepartmentName = (deptId: string | null): string => {
    if (!deptId) return 'Unassigned';
    const dept = departments.find(d => d.id === deptId);
    return dept?.name || 'Unknown';
  };

  const handleAddDepartment = async () => {
    if (!newDeptName.trim()) return;
    
    setIsAddingDept(true);
    const { error } = await supabase.from('departments').insert({
      name: newDeptName.trim(),
      parent_id: newDeptParent || null
    });
    setIsAddingDept(false);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Success', description: 'Department created successfully' });
      setNewDeptName('');
      setNewDeptParent(null);
      fetchData();
    }
  };

  const handleDeleteDepartment = async (id: string) => {
    const { error } = await supabase.from('departments').delete().eq('id', id);
    
    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Deleted', description: 'Department removed' });
      fetchData();
    }
  };

  const handleUpdateUser = async () => {
    if (!selectedUser) return;
    
    setIsEditingUser(true);
    
    // Update profile department
    await supabase
      .from('profiles')
      .update({ department_id: selectedDept })
      .eq('user_id', selectedUser.user_id);
    
    // Delete existing roles
    await supabase
      .from('user_roles')
      .delete()
      .eq('user_id', selectedUser.user_id);
    
    // Insert new role
    await supabase
      .from('user_roles')
      .insert({ user_id: selectedUser.user_id, role: selectedRole });
    
    setIsEditingUser(false);
    toast({ title: 'Updated', description: 'User settings updated successfully' });
    setSelectedUser(null);
    fetchData();
  };

  const openEditUser = (profile: Profile) => {
    setSelectedUser(profile);
    const roles = getUserRoles(profile.user_id);
    setSelectedRole(roles[0] || 'staff');
    setSelectedDept(profile.department_id);
  };

  const renderDepartmentTree = (parentId: string | null = null, level: number = 0): JSX.Element[] => {
    return departments
      .filter(d => d.parent_id === parentId)
      .map(dept => (
        <div key={dept.id}>
          <div 
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted/50 transition-colors"
            style={{ marginLeft: `${level * 24}px` }}
          >
            <div className="flex items-center gap-2">
              {level > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
              <Building2 className="h-4 w-4 text-primary" />
              <span className="font-medium">{dept.name}</span>
            </div>
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => handleDeleteDepartment(dept.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
          {renderDepartmentTree(dept.id, level + 1)}
        </div>
      ));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold tracking-tight mb-8">Admin Panel</h1>

        <Tabs defaultValue="users" className="space-y-6">
          <TabsList>
            <TabsTrigger value="users" className="gap-2">
              <Users className="h-4 w-4" /> Users
            </TabsTrigger>
            <TabsTrigger value="departments" className="gap-2">
              <Building2 className="h-4 w-4" /> Departments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="users">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>User Management</CardTitle>
                <CardDescription>Assign roles and departments to users</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {profiles.map(profile => (
                    <div 
                      key={profile.id}
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{profile.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        <div className="flex items-center gap-2 mt-2">
                          {getUserRoles(profile.user_id).map(role => (
                            <Badge key={role} variant="secondary" className="capitalize">
                              {role}
                            </Badge>
                          ))}
                          <Badge variant="outline">
                            {getDepartmentName(profile.department_id)}
                          </Badge>
                        </div>
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => openEditUser(profile)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Edit User</DialogTitle>
                            <DialogDescription>
                              Update role and department for {selectedUser?.full_name || selectedUser?.email}
                            </DialogDescription>
                          </DialogHeader>
                          
                          <div className="space-y-4 py-4">
                            <div className="space-y-2">
                              <Label>Role</Label>
                              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AppRole)}>
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="staff">Staff</SelectItem>
                                  <SelectItem value="manager">Manager</SelectItem>
                                  <SelectItem value="director">Director</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="space-y-2">
                              <Label>Department</Label>
                              <Select 
                                value={selectedDept || 'none'} 
                                onValueChange={(v) => setSelectedDept(v === 'none' ? null : v)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select department" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">Unassigned</SelectItem>
                                  {departments.map(dept => (
                                    <SelectItem key={dept.id} value={dept.id}>
                                      {dept.name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          
                          <DialogFooter>
                            <Button onClick={handleUpdateUser} disabled={isEditingUser}>
                              {isEditingUser && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                              Save Changes
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments">
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle>Department Structure</CardTitle>
                <CardDescription>Manage your organization hierarchy</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Add Department Form */}
                <div className="flex items-end gap-4 p-4 rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <Label>Department Name</Label>
                    <Input
                      placeholder="e.g., Engineering"
                      value={newDeptName}
                      onChange={(e) => setNewDeptName(e.target.value)}
                    />
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>Parent Department (Optional)</Label>
                    <Select 
                      value={newDeptParent || 'none'} 
                      onValueChange={(v) => setNewDeptParent(v === 'none' ? null : v)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="None (Top Level)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Top Level)</SelectItem>
                        {departments.map(dept => (
                          <SelectItem key={dept.id} value={dept.id}>
                            {dept.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleAddDepartment} disabled={isAddingDept || !newDeptName.trim()}>
                    {isAddingDept ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
                    Add
                  </Button>
                </div>

                {/* Department Tree */}
                <div className="space-y-1">
                  {departments.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No departments yet. Create your first one above.
                    </p>
                  ) : (
                    renderDepartmentTree()
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
