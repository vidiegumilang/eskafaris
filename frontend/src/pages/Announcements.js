import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import api, { formatApiErrorDetail } from '../utils/api';
import { Plus, Trash2, Edit, Megaphone, AlertTriangle, Info } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const PRIORITY_CONFIG = {
  urgent: { icon: AlertTriangle, bg: 'bg-red-50 border-red-200', badge: 'bg-red-100 text-red-700', iconColor: 'text-red-500' },
  important: { icon: Info, bg: 'bg-yellow-50 border-yellow-200', badge: 'bg-yellow-100 text-yellow-700', iconColor: 'text-yellow-500' },
  normal: { icon: Megaphone, bg: 'bg-white border-slate-200', badge: 'bg-slate-100 text-slate-600', iconColor: 'text-[#F4A261]' },
};

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', priority: 'normal', target_role: 'all' });

  useEffect(() => { fetchAnnouncements(); }, []);

  const fetchAnnouncements = async () => {
    try { const { data } = await api.get('/announcements'); setAnnouncements(data); } catch { toast.error('Failed to load'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) { await api.put(`/announcements/${editingId}`, formData); toast.success('Updated'); }
      else { await api.post('/announcements', formData); toast.success('Published'); }
      setIsDialogOpen(false); fetchAnnouncements(); resetForm();
    } catch (err) { toast.error(formatApiErrorDetail(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this announcement?')) return;
    try { await api.delete(`/announcements/${id}`); toast.success('Deleted'); fetchAnnouncements(); } catch { toast.error('Failed'); }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ title: item.title, content: item.content, priority: item.priority, target_role: item.target_role });
    setIsDialogOpen(true);
  };

  const resetForm = () => { setFormData({ title: '', content: '', priority: 'normal', target_role: 'all' }); setEditingId(null); };
  const canWrite = user?.role === 'admin' || user?.role === 'instructor';

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl tracking-tight font-semibold text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>Announcements</h1>
            <p className="text-sm text-slate-500 mt-2">Important notices and updates</p>
          </div>
          {canWrite && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-announcement-button" className="bg-[#F4A261] text-white hover:bg-[#E78A43] rounded-lg px-4 py-2 font-medium shadow-sm">
                  <Plus size={18} className="mr-2" />New Announcement
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg">
                <DialogHeader><DialogTitle>{editingId ? 'Edit' : 'New'} Announcement</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-3 mt-3">
                  <div>
                    <Label className="text-xs">Title</Label>
                    <Input data-testid="announcement-title-input" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} required className="mt-1" placeholder="Announcement title" />
                  </div>
                  <div>
                    <Label className="text-xs">Content</Label>
                    <Textarea data-testid="announcement-content-input" value={formData.content} onChange={e => setFormData({ ...formData, content: e.target.value })} required className="mt-1" rows={5} placeholder="Write announcement content..." />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Priority</Label>
                      <Select value={formData.priority} onValueChange={v => setFormData({ ...formData, priority: v })}>
                        <SelectTrigger data-testid="announcement-priority-select" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="normal">Normal</SelectItem>
                          <SelectItem value="important">Important</SelectItem>
                          <SelectItem value="urgent">Urgent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-xs">Target Audience</Label>
                      <Select value={formData.target_role} onValueChange={v => setFormData({ ...formData, target_role: v })}>
                        <SelectTrigger data-testid="announcement-target-select" className="mt-1"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Everyone</SelectItem>
                          <SelectItem value="instructor">Instructors Only</SelectItem>
                          <SelectItem value="student">Students Only</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" onClick={() => setIsDialogOpen(false)} className="flex-1 border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white">Cancel</Button>
                    <Button type="submit" data-testid="announcement-submit-button" disabled={loading} className="flex-1 bg-[#F4A261] text-white hover:bg-[#E78A43]">{loading ? 'Saving...' : editingId ? 'Update' : 'Publish'}</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="space-y-3">
          {announcements.length === 0 ? (
            <Card className="border-slate-200 shadow-sm"><CardContent className="p-8 text-center text-slate-500">No announcements yet</CardContent></Card>
          ) : announcements.map(item => {
            const config = PRIORITY_CONFIG[item.priority] || PRIORITY_CONFIG.normal;
            const Icon = config.icon;
            return (
              <Card key={item.id} className={`${config.bg} shadow-sm`} data-testid="announcement-card">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5"><Icon size={20} className={config.iconColor} /></div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-[#0B192C]">{item.title}</h3>
                          <Badge className={config.badge}>{item.priority}</Badge>
                          <Badge className="bg-slate-100 text-slate-500 text-xs">For: {item.target_role}</Badge>
                        </div>
                        <p className="text-sm text-slate-600 mt-2 whitespace-pre-wrap">{item.content}</p>
                        <div className="flex items-center gap-3 mt-3 text-xs text-slate-400">
                          <span>By: {item.author_name} ({item.author_role})</span>
                          <span>{item.created_at?.split('T')[0]}</span>
                        </div>
                      </div>
                    </div>
                    {canWrite && (
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(item)} data-testid="edit-announcement-button" className="p-1.5 text-[#F4A261] hover:bg-slate-100 rounded-lg"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(item.id)} data-testid="delete-announcement-button" className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
