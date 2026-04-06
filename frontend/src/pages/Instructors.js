import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import api, { formatApiErrorDetail } from '../utils/api';
import { Plus, Upload, Trash2, Edit } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

export default function Instructors() {
  const { user } = useAuth();
  const [instructors, setInstructors] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    callsign: '',
    license_expiry: '',
    phone: '',
  });

  useEffect(() => {
    fetchInstructors();
  }, []);

  const fetchInstructors = async () => {
    try {
      const { data } = await api.get('/instructors');
      setInstructors(data);
    } catch (error) {
      console.error('Error fetching instructors:', error);
      toast.error('Failed to load instructors');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (editingId) {
        await api.put(`/instructors/${editingId}`, formData);
        toast.success('Instructor updated successfully');
      } else {
        await api.post('/instructors', formData);
        toast.success('Instructor created successfully');
      }
      setIsDialogOpen(false);
      fetchInstructors();
      resetForm();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this instructor?')) return;

    try {
      await api.delete(`/instructors/${id}`);
      toast.success('Instructor deleted successfully');
      fetchInstructors();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    }
  };

  const handleEdit = (instructor) => {
    setEditingId(instructor.id);
    setFormData({
      name: instructor.name,
      callsign: instructor.callsign,
      license_expiry: instructor.license_expiry,
      phone: instructor.phone || '',
    });
    setIsDialogOpen(true);
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/import/instructors', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      toast.success('Instructors imported successfully');
      setIsImportDialogOpen(false);
      fetchInstructors();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    }
  };

  const resetForm = () => {
    setFormData({ name: '', callsign: '', license_expiry: '', phone: '' });
    setEditingId(null);
  };

  const canEdit = user?.role === 'admin' || user?.role === 'instructor';
  const canDelete = user?.role === 'admin';

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1
              className="text-4xl tracking-tight font-semibold text-[#0B192C]"
              style={{ fontFamily: 'Outfit, sans-serif' }}
            >
              Instructors
            </h1>
            <p className="text-sm text-slate-500 mt-2">Manage flight instructors and their licenses</p>
          </div>

          <div className="flex gap-3">
            {canEdit && (
              <>
                <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button
                      data-testid="import-instructors-button"
                      className="border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white transition-colors rounded-lg px-4 py-2 font-medium"
                    >
                      <Upload size={18} className="mr-2" />
                      Import CSV
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Import Instructors from CSV/Excel</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <p className="text-sm text-slate-600">
                        Upload an Excel file with columns: <strong>name</strong>, <strong>callsign</strong>,{' '}
                        <strong>license_expiry</strong>
                      </p>
                      <Input
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        data-testid="import-file-input"
                        onChange={handleImport}
                        className="cursor-pointer"
                      />
                    </div>
                  </DialogContent>
                </Dialog>

                <Dialog
                  open={isDialogOpen}
                  onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) resetForm();
                  }}
                >
                  <DialogTrigger asChild>
                    <Button
                      data-testid="add-instructor-button"
                      className="bg-[#F4A261] text-white hover:bg-[#E78A43] transition-colors rounded-lg px-4 py-2 font-medium shadow-sm"
                    >
                      <Plus size={18} className="mr-2" />
                      Add Instructor
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>{editingId ? 'Edit Instructor' : 'Create New Instructor'}</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                      <div>
                        <Label htmlFor="name">Name</Label>
                        <Input
                          id="name"
                          data-testid="instructor-name-input"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          required
                          className="mt-1"
                          placeholder="John Doe"
                        />
                      </div>

                      <div>
                        <Label htmlFor="callsign">Callsign</Label>
                        <Input
                          id="callsign"
                          data-testid="instructor-callsign-input"
                          value={formData.callsign}
                          onChange={(e) => setFormData({ ...formData, callsign: e.target.value })}
                          required
                          className="mt-1"
                          placeholder="ALPHA1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="license_expiry">License Expiry</Label>
                        <Input
                          id="license_expiry"
                          type="date"
                          data-testid="instructor-license-input"
                          value={formData.license_expiry}
                          onChange={(e) => setFormData({ ...formData, license_expiry: e.target.value })}
                          required
                          className="mt-1"
                        />
                      </div>

                      <div>
                        <Label htmlFor="phone">Phone (WhatsApp)</Label>
                        <Input
                          id="phone"
                          data-testid="instructor-phone-input"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="mt-1"
                          placeholder="628123456789"
                        />
                      </div>

                      <div className="flex gap-3 pt-2">
                        <Button
                          type="button"
                          onClick={() => setIsDialogOpen(false)}
                          className="flex-1 border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="submit"
                          data-testid="instructor-submit-button"
                          disabled={loading}
                          className="flex-1 bg-[#F4A261] text-white hover:bg-[#E78A43]"
                        >
                          {loading ? (editingId ? 'Updating...' : 'Creating...') : editingId ? 'Update' : 'Create'}
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
            <CardTitle className="text-xl font-medium text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Instructor List
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Callsign
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      License Expiry
                    </th>
                    {(canEdit || canDelete) && (
                      <th className="px-6 py-3 text-right text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                        Actions
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {instructors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No instructors found
                      </td>
                    </tr>
                  ) : (
                    instructors.map((instructor) => (
                      <tr key={instructor.id} className="hover:bg-slate-50 transition-colors" data-testid="instructor-row">
                        <td className="px-6 py-4 text-sm text-[#0B192C] font-medium">{instructor.name}</td>
                        <td className="px-6 py-4 text-sm text-[#0B192C]">{instructor.callsign}</td>
                        <td className="px-6 py-4 text-sm text-[#0B192C]">{instructor.license_expiry}</td>
                        {(canEdit || canDelete) && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex justify-end gap-2">
                              {canEdit && (
                                <button
                                  onClick={() => handleEdit(instructor)}
                                  data-testid="edit-instructor-button"
                                  className="p-2 text-[#F4A261] hover:bg-slate-100 rounded-lg transition-colors"
                                >
                                  <Edit size={16} />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  onClick={() => handleDelete(instructor.id)}
                                  data-testid="delete-instructor-button"
                                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                >
                                  <Trash2 size={16} />
                                </button>
                              )}
                            </div>
                          </td>
                        )}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}