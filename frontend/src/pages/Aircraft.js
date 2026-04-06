import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import api, { formatApiErrorDetail } from '../utils/api';
import { Plus, Upload, Trash2, Edit } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Badge } from '../components/ui/badge';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export default function Aircraft() {
  const { user } = useAuth();
  const [aircraft, setAircraft] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ registration: '', total_hours: '0:00', status_hours: 0, is_insured: true, aircraft_type: '', remarks: '' });

  useEffect(() => { fetchAircraft(); }, []);

  const fetchAircraft = async () => {
    try { const { data } = await api.get('/aircraft'); setAircraft(data); } catch { toast.error('Failed to load aircraft'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (editingId) { await api.put(`/aircraft/${editingId}`, formData); toast.success('Aircraft updated'); }
      else { await api.post('/aircraft', formData); toast.success('Aircraft created'); }
      setIsDialogOpen(false); fetchAircraft(); resetForm();
    } catch (error) { toast.error(formatApiErrorDetail(error.response?.data?.detail)); } finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this aircraft?')) return;
    try { await api.delete(`/aircraft/${id}`); toast.success('Deleted'); fetchAircraft(); } catch (err) { toast.error('Delete failed'); }
  };

  const handleEdit = (item) => {
    setEditingId(item.id);
    setFormData({ registration: item.registration, total_hours: item.total_hours || '0:00', status_hours: item.status_hours, is_insured: item.is_insured, aircraft_type: item.aircraft_type || '', remarks: item.remarks || '' });
    setIsDialogOpen(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0]; if (!file) return;
    const fd = new FormData(); fd.append('file', file);
    try { await api.post('/import/aircraft', fd, { headers: { 'Content-Type': 'multipart/form-data' } }); toast.success('Imported'); setIsImportDialogOpen(false); fetchAircraft(); } catch (err) { toast.error('Import failed'); }
  };

  const resetForm = () => { setFormData({ registration: '', total_hours: '0:00', status_hours: 0, is_insured: true, aircraft_type: '', remarks: '' }); setEditingId(null); };

  const canEdit = user?.role === 'admin' || user?.role === 'instructor';
  const canDelete = user?.role === 'admin';

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-4xl tracking-tight font-semibold text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>Aircraft</h1>
            <p className="text-sm text-slate-500 mt-2">Manage fleet registration and status hours</p>
          </div>
          <div className="flex gap-3">
            {canEdit && (
              <>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button data-testid="import-aircraft-button" className="border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white rounded-lg px-4 py-2 font-medium"><Upload size={18} className="mr-2" />Import</Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>Import Aircraft</DialogTitle></DialogHeader>
                    <div className="space-y-4 mt-4">
                      <p className="text-sm text-slate-600">Upload Excel/CSV: <strong>registration</strong>, <strong>total_hours</strong>, <strong>status_hours</strong>, <strong>is_insured</strong>, <strong>aircraft_type</strong></p>
                      <Input type="file" accept=".xlsx,.xls,.csv" data-testid="import-file-input" onChange={handleImport} />
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
                  <DialogTrigger asChild>
                    <Button data-testid="add-aircraft-button" className="bg-[#F4A261] text-white hover:bg-[#E78A43] rounded-lg px-4 py-2 font-medium shadow-sm">
                      <Plus size={18} className="mr-2" />Add Aircraft
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>{editingId ? 'Edit Aircraft' : 'Add New Aircraft'}</DialogTitle></DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Registration</Label>
                          <Input data-testid="aircraft-registration-input" value={formData.registration} onChange={e => setFormData({ ...formData, registration: e.target.value })} required className="mt-1" placeholder="PK - AEA" />
                        </div>
                        <div>
                          <Label>Type</Label>
                          <Input data-testid="aircraft-type-input" value={formData.aircraft_type} onChange={e => setFormData({ ...formData, aircraft_type: e.target.value })} className="mt-1" placeholder="WARRIOR" />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label>Total Hours</Label>
                          <Input data-testid="aircraft-total-hours-input" value={formData.total_hours} onChange={e => setFormData({ ...formData, total_hours: e.target.value })} className="mt-1" placeholder="768:45" />
                        </div>
                        <div>
                          <Label>Status Hours</Label>
                          <Input data-testid="aircraft-hours-input" type="number" step="0.1" value={formData.status_hours} onChange={e => setFormData({ ...formData, status_hours: parseFloat(e.target.value) || 0 })} className="mt-1" />
                        </div>
                      </div>
                      <div>
                        <Label>Remarks</Label>
                        <Input data-testid="aircraft-remarks-input" value={formData.remarks} onChange={e => setFormData({ ...formData, remarks: e.target.value })} className="mt-1" placeholder="Aircraft status remarks" />
                      </div>
                      <div className="flex items-center justify-between">
                        <Label>Insured</Label>
                        <Switch data-testid="aircraft-insured-switch" checked={formData.is_insured} onCheckedChange={checked => setFormData({ ...formData, is_insured: checked })} />
                      </div>
                      <div className="flex gap-3 pt-2">
                        <Button type="button" onClick={() => setIsDialogOpen(false)} className="flex-1 border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white">Cancel</Button>
                        <Button type="submit" data-testid="aircraft-submit-button" disabled={loading} className="flex-1 bg-[#F4A261] text-white hover:bg-[#E78A43]">
                          {loading ? 'Saving...' : editingId ? 'Update' : 'Create'}
                        </Button>
                      </div>
                    </form>
                  </DialogContent>
                </Dialog>
              </>
            )}
          </div>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xl font-medium text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>Aircraft Fleet</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">Registration</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">Total Hours</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">Insurance</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">Remarks</th>
                    {(canEdit || canDelete) && <th className="px-6 py-3 text-right text-xs font-semibold text-[#0B192C] uppercase tracking-wider">Actions</th>}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {aircraft.length === 0 ? (
                    <tr><td colSpan={6} className="px-6 py-8 text-center text-slate-500">No aircraft found</td></tr>
                  ) : aircraft.map(item => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors" data-testid="aircraft-row">
                      <td className="px-6 py-4 text-sm text-[#0B192C] font-bold">{item.registration}</td>
                      <td className="px-6 py-4 text-sm text-slate-600">{item.aircraft_type || '-'}</td>
                      <td className="px-6 py-4 text-sm text-[#0B192C] font-medium">{item.total_hours || '0:00'}</td>
                      <td className="px-6 py-4">
                        <Badge className={item.is_insured ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}>
                          {item.is_insured ? 'Insured' : 'Not Insured'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-500 max-w-[200px] truncate">{item.remarks || '-'}</td>
                      {(canEdit || canDelete) && (
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {canEdit && <button onClick={() => handleEdit(item)} data-testid="edit-aircraft-button" className="p-2 text-[#F4A261] hover:bg-slate-100 rounded-lg"><Edit size={16} /></button>}
                            {canDelete && <button onClick={() => handleDelete(item.id)} data-testid="delete-aircraft-button" className="p-2 text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>}
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
