import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import api, { formatApiErrorDetail } from '../utils/api';
import { Plus, Trash2, Edit } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const STAGE_COLORS = {
  PPL: { bg: '#E0F2FE', text: '#0284C7' },
  CPL: { bg: '#FFEDD5', text: '#C2410C' },
  IR:  { bg: '#F3E8FF', text: '#7E22CE' },
  FIC: { bg: '#DCFCE7', text: '#15803D' },
  ME:  { bg: '#FEE2E2', text: '#B91C1C' },
};

export default function Stages() {
  const { user } = useAuth();
  const [stages, setStages] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', exercises: '' });

  useEffect(() => { fetchStages(); }, []);

  const fetchStages = async () => {
    try { const { data } = await api.get('/stages'); setStages(data); } catch { toast.error('Failed to load stages'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = { name: formData.name, description: formData.description, exercises: formData.exercises.split(',').map(s => s.trim()).filter(Boolean) };
      if (editingId) { await api.put(`/stages/${editingId}`, payload); toast.success('Stage updated'); }
      else { await api.post('/stages', payload); toast.success('Stage created'); }
      setIsDialogOpen(false); fetchStages(); resetForm();
    } catch (error) { toast.error(formatApiErrorDetail(error.response?.data?.detail)); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this stage?')) return;
    try { await api.delete(`/stages/${id}`); toast.success('Deleted'); fetchStages(); } catch { toast.error('Delete failed'); }
  };

  const handleEdit = (stage) => {
    setEditingId(stage.id);
    setFormData({ name: stage.name, description: stage.description || '', exercises: (stage.exercises || []).join(', ') });
    setIsDialogOpen(true);
  };

  const resetForm = () => { setFormData({ name: '', description: '', exercises: '' }); setEditingId(null); };
  const canEdit = user?.role === 'admin';

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl tracking-tight font-semibold text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>Training Stages</h1>
            <p className="text-sm text-slate-500 mt-2">PPL, CPL, IR, FIC, ME phases with exercise lists</p>
          </div>
          {canEdit && (
            <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
              <DialogTrigger asChild>
                <Button data-testid="add-stage-button" className="bg-[#F4A261] text-white hover:bg-[#E78A43] rounded-lg px-4 py-2 font-medium shadow-sm">
                  <Plus size={18} className="mr-2" />Add Stage
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader><DialogTitle>{editingId ? 'Edit Stage' : 'Create New Stage'}</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label>Stage Name</Label>
                    <Input data-testid="stage-name-input" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required className="mt-1" placeholder="PPL, CPL, IR, FIC, ME" />
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Input data-testid="stage-description-input" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="mt-1" placeholder="Private Pilot License" />
                  </div>
                  <div>
                    <Label>Exercises (comma separated)</Label>
                    <Textarea data-testid="stage-exercises-input" value={formData.exercises} onChange={e => setFormData({ ...formData, exercises: e.target.value })} className="mt-1" rows={3} placeholder="A1, A2, A3, A4, A5..." />
                  </div>
                  <div className="flex gap-3 pt-2">
                    <Button type="button" onClick={() => setIsDialogOpen(false)} className="flex-1 border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white">Cancel</Button>
                    <Button type="submit" data-testid="stage-submit-button" disabled={loading} className="flex-1 bg-[#F4A261] text-white hover:bg-[#E78A43]">
                      {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {stages.length === 0 ? (
            <Card className="col-span-full border-slate-200 shadow-sm"><CardContent className="p-8 text-center text-slate-500">No stages found</CardContent></Card>
          ) : stages.map(stage => {
            const colors = STAGE_COLORS[stage.name] || { bg: '#f1f5f9', text: '#475569' };
            return (
              <Card key={stage.id} className="border-slate-200 shadow-sm" data-testid="stage-card">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className="text-sm px-3 py-1 font-bold" style={{ backgroundColor: colors.bg, color: colors.text }}>{stage.name}</Badge>
                      <span className="text-sm text-slate-600">{stage.description}</span>
                    </div>
                    {canEdit && (
                      <div className="flex gap-1">
                        <button onClick={() => handleEdit(stage)} data-testid="edit-stage-button" className="p-1.5 text-[#F4A261] hover:bg-slate-100 rounded-lg"><Edit size={14} /></button>
                        <button onClick={() => handleDelete(stage.id)} data-testid="delete-stage-button" className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                      </div>
                    )}
                  </div>
                  <div className="border-t border-slate-100 pt-3">
                    <p className="text-xs text-slate-500 font-medium mb-2">Exercises ({(stage.exercises || []).length})</p>
                    <div className="flex flex-wrap gap-1">
                      {(stage.exercises || []).map(ex => (
                        <span key={ex} className="inline-block px-2 py-0.5 rounded text-[10px] font-medium" style={{ backgroundColor: colors.bg, color: colors.text }}>
                          {ex}
                        </span>
                      ))}
                    </div>
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
