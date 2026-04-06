import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import api, { formatApiErrorDetail } from '../utils/api';
import { Plus, Trash2, Edit, Users } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export default function Courses() {
  const { user } = useAuth();
  const [courses, setCourses] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });

  useEffect(() => { fetchCourses(); }, []);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data);
    } catch (error) {
      toast.error('Failed to load courses');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) {
        await api.put(`/courses/${editingId}`, formData);
        toast.success('Course updated');
      } else {
        await api.post('/courses', formData);
        toast.success('Course created');
      }
      setIsDialogOpen(false);
      fetchCourses();
      resetForm();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this course?')) return;
    try {
      await api.delete(`/courses/${id}`);
      toast.success('Course deleted');
      fetchCourses();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    }
  };

  const handleEdit = (course) => {
    setEditingId(course.id);
    setFormData({ name: course.name, description: course.description || '' });
    setIsDialogOpen(true);
  };

  const resetForm = () => { setFormData({ name: '', description: '' }); setEditingId(null); };

  const canEdit = user?.role === 'admin' || user?.role === 'instructor';

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl tracking-tight font-semibold text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>Courses</h1>
            <p className="text-sm text-slate-500 mt-2">Manage training courses and student grouping</p>
          </div>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-course-button" className="bg-[#F4A261] text-white hover:bg-[#E78A43] rounded-lg px-4 py-2 font-medium shadow-sm">
                  <Plus size={18} className="mr-2" />Add Course
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingId ? 'Edit Course' : 'Create New Course'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="name">Course Name</Label>
                    <Input id="name" data-testid="course-name-input" value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })} required className="mt-1" placeholder="e.g., PNB 7, PNB 8" />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input id="description" data-testid="course-description-input" value={formData.description}
                      onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1" placeholder="Course description" />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" onClick={() => setIsDialogOpen(false)} className="flex-1 border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white">Cancel</Button>
                    <Button type="submit" data-testid="course-submit-button" disabled={loading} className="flex-1 bg-[#F4A261] text-white hover:bg-[#E78A43]">
                      {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.length === 0 ? (
            <Card className="col-span-full border-slate-200 shadow-sm">
              <CardContent className="p-8 text-center text-slate-500">No courses found. Create your first course to group students.</CardContent>
            </Card>
          ) : (
            courses.map(course => (
              <Card key={course.id} className="border-slate-200 shadow-sm" data-testid="course-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-[#0B192C] text-lg" style={{ fontFamily: 'Outfit' }}>{course.name}</h3>
                      {course.description && <p className="text-xs text-slate-500 mt-1">{course.description}</p>}
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(course)} data-testid="edit-course-button" className="p-1.5 text-[#F4A261] hover:bg-slate-100 rounded-lg transition-colors"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(course.id)} data-testid="delete-course-button" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-3 mt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <Users size={14} className="text-slate-400" />
                      <span className="text-xs text-slate-500 font-medium">Students ({course.students?.length || 0})</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {(course.students || []).map(st => (
                        <Badge key={st.id} className="bg-[#E0F2FE] text-[#0284C7] text-[10px]">{st.name}</Badge>
                      ))}
                      {(!course.students || course.students.length === 0) && (
                        <p className="text-xs text-slate-400">No students assigned</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
