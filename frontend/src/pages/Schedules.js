import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import api, { formatApiErrorDetail } from '../utils/api';
import { Plus, Download } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { toast } from 'sonner';

export default function Schedules() {
  const [schedules, setSchedules] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [students, setStudents] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [stages, setStages] = useState([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [loading, setLoading] = useState(false);

  const [formData, setFormData] = useState({
    date: '',
    time_slot: '',
    aircraft_id: '',
    instructor_id: '',
    student_id: '',
    stage_id: '',
    status: 'scheduled',
  });

  useEffect(() => {
    fetchData();
  }, [filterDate]);

  const fetchData = async () => {
    try {
      const params = filterDate ? `?date=${filterDate}` : '';
      const [schedulesRes, instructorsRes, studentsRes, aircraftRes, stagesRes] = await Promise.all([
        api.get(`/schedules${params}`),
        api.get('/instructors'),
        api.get('/students'),
        api.get('/aircraft'),
        api.get('/stages'),
      ]);

      setSchedules(schedulesRes.data);
      setInstructors(instructorsRes.data);
      setStudents(studentsRes.data);
      setAircraft(aircraftRes.data.filter((a) => a.is_insured));
      setStages(stagesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load schedules');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await api.post('/schedules', formData);
      toast.success('Schedule created successfully');
      setIsDialogOpen(false);
      fetchData();
      resetForm();
    } catch (error) {
      toast.error(formatApiErrorDetail(error.response?.data?.detail));
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/export/schedules', {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'flight_schedules.xlsx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Report exported successfully');
    } catch (error) {
      toast.error('Failed to export report');
    }
  };

  const resetForm = () => {
    setFormData({
      date: '',
      time_slot: '',
      aircraft_id: '',
      instructor_id: '',
      student_id: '',
      stage_id: '',
      status: 'scheduled',
    });
  };

  const getStageColor = (stageName) => {
    const name = stageName?.toLowerCase() || '';
    if (name.includes('ppl')) return 'status-badge-ppl';
    if (name.includes('cpl')) return 'status-badge-cpl';
    if (name.includes('ir')) return 'status-badge-ir';
    if (name.includes('fic')) return 'status-badge-fic';
    if (name.includes('me')) return 'status-badge-me';
    return 'bg-slate-200 text-slate-700';
  };

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
              Flight Schedules
            </h1>
            <p className="text-sm text-slate-500 mt-2">Manage and view flight training schedules</p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={handleExport}
              data-testid="export-schedules-button"
              className="border border-slate-200 text-[#0B192C] hover:bg-slate-50 bg-white transition-colors rounded-lg px-4 py-2 font-medium"
            >
              <Download size={18} className="mr-2" />
              Export
            </Button>

            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button
                  data-testid="add-schedule-button"
                  className="bg-[#F4A261] text-white hover:bg-[#E78A43] transition-colors rounded-lg px-4 py-2 font-medium shadow-sm"
                >
                  <Plus size={18} className="mr-2" />
                  Add Schedule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create New Schedule</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                  <div>
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      data-testid="schedule-date-input"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="time_slot">Time Slot</Label>
                    <Input
                      id="time_slot"
                      type="time"
                      data-testid="schedule-time-input"
                      value={formData.time_slot}
                      onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })}
                      required
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="aircraft">Aircraft</Label>
                    <Select
                      value={formData.aircraft_id}
                      onValueChange={(value) => setFormData({ ...formData, aircraft_id: value })}
                    >
                      <SelectTrigger data-testid="schedule-aircraft-select" className="mt-1">
                        <SelectValue placeholder="Select aircraft" />
                      </SelectTrigger>
                      <SelectContent>
                        {aircraft.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.registration}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="instructor">Instructor</Label>
                    <Select
                      value={formData.instructor_id}
                      onValueChange={(value) => setFormData({ ...formData, instructor_id: value })}
                    >
                      <SelectTrigger data-testid="schedule-instructor-select" className="mt-1">
                        <SelectValue placeholder="Select instructor" />
                      </SelectTrigger>
                      <SelectContent>
                        {instructors.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name} ({item.callsign})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="student">Student</Label>
                    <Select
                      value={formData.student_id}
                      onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                    >
                      <SelectTrigger data-testid="schedule-student-select" className="mt-1">
                        <SelectValue placeholder="Select student" />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="stage">Stage</Label>
                    <Select
                      value={formData.stage_id}
                      onValueChange={(value) => setFormData({ ...formData, stage_id: value })}
                    >
                      <SelectTrigger data-testid="schedule-stage-select" className="mt-1">
                        <SelectValue placeholder="Select stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {stages.map((item) => (
                          <SelectItem key={item.id} value={item.id}>
                            {item.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger data-testid="schedule-status-select" className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="scheduled">Scheduled</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
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
                      data-testid="schedule-submit-button"
                      disabled={loading}
                      className="flex-1 bg-[#F4A261] text-white hover:bg-[#E78A43]"
                    >
                      {loading ? 'Creating...' : 'Create'}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6">
          <Label htmlFor="filter-date" className="text-[#0B192C] font-medium mb-2 block">
            Filter by Date
          </Label>
          <Input
            id="filter-date"
            type="date"
            data-testid="filter-date-input"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="max-w-xs border-slate-200"
          />
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-200">
            <CardTitle className="text-xl font-medium text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>
              Schedule List
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Aircraft
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Instructor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Student
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Stage
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#0B192C] uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {schedules.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-slate-500">
                        No schedules found
                      </td>
                    </tr>
                  ) : (
                    schedules.map((schedule) => (
                      <tr key={schedule.id} className="hover:bg-slate-50 transition-colors" data-testid="schedule-row">
                        <td className="px-6 py-4 text-sm text-[#0B192C]">{schedule.date}</td>
                        <td className="px-6 py-4 text-sm text-[#0B192C]">{schedule.time_slot}</td>
                        <td className="px-6 py-4 text-sm text-[#0B192C] font-medium">
                          {schedule.aircraft?.registration || 'N/A'}
                        </td>
                        <td className="px-6 py-4 text-sm text-[#0B192C]">{schedule.instructor?.name || 'N/A'}</td>
                        <td className="px-6 py-4 text-sm text-[#0B192C]">{schedule.student?.name || 'N/A'}</td>
                        <td className="px-6 py-4">
                          <Badge className={getStageColor(schedule.stage?.name)}>{schedule.stage?.name || 'N/A'}</Badge>
                        </td>
                        <td className="px-6 py-4">
                          <Badge
                            className={
                              schedule.status === 'completed'
                                ? 'bg-green-100 text-green-700'
                                : schedule.status === 'cancelled'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                            }
                          >
                            {schedule.status}
                          </Badge>
                        </td>
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