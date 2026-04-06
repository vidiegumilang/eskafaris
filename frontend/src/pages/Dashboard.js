import { useEffect, useState } from 'react';
import { Sidebar } from '../components/Sidebar';
import api from '../utils/api';
import { Bell, Calendar, Users, UserCheck, Plane, AlertCircle, Megaphone } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';

export default function Dashboard() {
  const [stats, setStats] = useState({
    instructors: 0,
    students: 0,
    aircraft: 0,
    schedules: 0,
  });
  const [expiringLicenses, setExpiringLicenses] = useState({ instructors: [], students: [], total: 0 });
  const [upcomingSchedules, setUpcomingSchedules] = useState([]);
  const [announcements, setAnnouncements] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [instructorsRes, studentsRes, aircraftRes, schedulesRes, notificationsRes, announcementsRes] = await Promise.all([
        api.get('/instructors'),
        api.get('/students'),
        api.get('/aircraft'),
        api.get('/schedules'),
        api.get('/notifications/expiring-licenses'),
        api.get('/announcements'),
      ]);

      setStats({
        instructors: instructorsRes.data.length,
        students: studentsRes.data.length,
        aircraft: aircraftRes.data.length,
        schedules: schedulesRes.data.length,
      });

      setExpiringLicenses(notificationsRes.data);
      setUpcomingSchedules(schedulesRes.data.slice(0, 5));
      setAnnouncements(announcementsRes.data.slice(0, 3));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    }
  };

  const statCards = [
    { title: 'Instructors', value: stats.instructors, icon: UserCheck, color: 'text-[#0284C7]' },
    { title: 'Students', value: stats.students, icon: Users, color: 'text-[#C2410C]' },
    { title: 'Aircraft', value: stats.aircraft, icon: Plane, color: 'text-[#7E22CE]' },
    { title: 'Schedules', value: stats.schedules, icon: Calendar, color: 'text-[#15803D]' },
  ];

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="mb-8">
          <h1 className="text-4xl tracking-tight font-semibold text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-2">Welcome to Flight Operations Training Management</p>
        </div>

        {expiringLicenses.total > 0 && (
          <div data-testid="expiring-licenses-alert" className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-xl flex items-start gap-3">
            <AlertCircle className="text-yellow-600 mt-0.5" size={20} />
            <div>
              <h3 className="font-semibold text-yellow-900">License Expiry Alert</h3>
              <p className="text-sm text-yellow-700 mt-1">
                {expiringLicenses.total} license(s) expiring within the next 30 days
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <Card key={stat.title} className="border-slate-200 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">{stat.title}</p>
                      <p className="text-3xl font-semibold text-[#0B192C]">{stat.value}</p>
                    </div>
                    <div className={`p-3 bg-slate-100 rounded-lg ${stat.color}`}>
                      <Icon size={24} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-xl font-medium text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Expiring Licenses
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {expiringLicenses.total === 0 ? (
                <p className="text-sm text-slate-500">No licenses expiring soon</p>
              ) : (
                <div className="space-y-3">
                  {expiringLicenses.instructors.map((instructor) => (
                    <div key={instructor.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-[#0B192C]">{instructor.name}</p>
                        <p className="text-xs text-slate-500">Instructor - {instructor.callsign}</p>
                      </div>
                      <Badge className="status-badge-ppl">{instructor.license_expiry}</Badge>
                    </div>
                  ))}
                  {expiringLicenses.students.map((student) => (
                    <div key={student.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <p className="font-medium text-[#0B192C]">{student.name}</p>
                        <p className="text-xs text-slate-500">Student</p>
                      </div>
                      <Badge className="status-badge-cpl">{student.license_expiry}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-xl font-medium text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Upcoming Schedules
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {upcomingSchedules.length === 0 ? (
                <p className="text-sm text-slate-500">No schedules found</p>
              ) : (
                <div className="space-y-3">
                  {upcomingSchedules.map((schedule) => (
                    <div key={schedule.id} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                      <Calendar className="text-[#F4A261] mt-0.5" size={18} />
                      <div className="flex-1">
                        <p className="font-medium text-[#0B192C] text-sm">
                          {schedule.aircraft_id || 'N/A'} - Period {schedule.period_number}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {schedule.instructor_callsign || '-'} / {schedule.student_name || '-'}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge className="text-xs">{schedule.date}</Badge>
                          {schedule.exercise && (
                            <Badge className="bg-blue-100 text-blue-700">
                              {schedule.exercise}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Announcements */}
        {announcements.length > 0 && (
          <Card className="border-slate-200 shadow-sm mt-6">
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="text-xl font-medium text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                Latest Announcements
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-3">
              {announcements.map(item => (
                <div key={item.id} className={`p-3 rounded-lg border ${item.priority === 'urgent' ? 'bg-red-50 border-red-200' : item.priority === 'important' ? 'bg-yellow-50 border-yellow-200' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Megaphone size={14} className={item.priority === 'urgent' ? 'text-red-500' : 'text-[#F4A261]'} />
                    <span className="font-semibold text-[#0B192C] text-sm">{item.title}</span>
                    <Badge className={`text-[10px] ${item.priority === 'urgent' ? 'bg-red-100 text-red-700' : item.priority === 'important' ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-100 text-slate-600'}`}>{item.priority}</Badge>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{item.content}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}