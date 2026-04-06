import { useEffect, useState, useCallback } from 'react';
import { Sidebar } from '../components/Sidebar';
import api from '../utils/api';
import { CheckCircle2, Circle, ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Badge } from '../components/ui/badge';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';

const STAGE_COLORS = {
  PPL: { bg: '#E0F2FE', text: '#0284C7', bar: '#0284C7' },
  CPL: { bg: '#FFEDD5', text: '#C2410C', bar: '#C2410C' },
  IR:  { bg: '#F3E8FF', text: '#7E22CE', bar: '#7E22CE' },
  FIC: { bg: '#DCFCE7', text: '#15803D', bar: '#15803D' },
  ME:  { bg: '#FEE2E2', text: '#B91C1C', bar: '#B91C1C' },
};

export default function ProgressTracker() {
  const { user } = useAuth();
  const [students, setStudents] = useState([]);
  const [stages, setStages] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [progress, setProgress] = useState([]);
  const [expandedStages, setExpandedStages] = useState({});
  const [expandedSubs, setExpandedSubs] = useState({});

  useEffect(() => {
    api.get('/students').then(r => setStudents(r.data)).catch(() => {});
    api.get('/stages').then(r => setStages(r.data)).catch(() => {});
  }, []);

  const fetchProgress = useCallback(async () => {
    if (!selectedStudent) return;
    try {
      const { data } = await api.get(`/progress/${selectedStudent}`);
      setProgress(data);
    } catch { console.error('Failed to load progress'); }
  }, [selectedStudent]);

  useEffect(() => { fetchProgress(); }, [fetchProgress]);

  const isCompleted = (stageName, exercise) => {
    return progress.some(p => p.stage_name === stageName && p.exercise === exercise);
  };

  const getProgressEntry = (stageName, exercise) => {
    return progress.find(p => p.stage_name === stageName && p.exercise === exercise);
  };

  const toggleExercise = async (stageName, exercise) => {
    if (user?.role === 'student') return;
    const entry = getProgressEntry(stageName, exercise);
    if (entry) {
      try {
        await api.delete(`/progress/${entry.id}`);
        toast.success(`${exercise} unmarked`);
        fetchProgress();
      } catch { toast.error('Failed'); }
    } else {
      try {
        await api.post('/progress', {
          student_id: selectedStudent,
          stage_name: stageName,
          exercise: exercise,
          completed_date: new Date().toISOString().split('T')[0],
          instructor_callsign: user?.name || '',
        });
        toast.success(`${exercise} completed`);
        fetchProgress();
      } catch (err) { toast.error(err.response?.data?.detail || 'Failed'); }
    }
  };

  const toggleStage = (name) => setExpandedStages(prev => ({ ...prev, [name]: !prev[name] }));
  const toggleSub = (key) => setExpandedSubs(prev => ({ ...prev, [key]: !prev[key] }));

  const getStageProgress = (stage) => {
    const exercises = stage.exercises || [];
    const completed = exercises.filter(ex => isCompleted(stage.name, ex)).length;
    return { completed, total: exercises.length, percent: exercises.length > 0 ? Math.round((completed / exercises.length) * 100) : 0 };
  };

  const getSubStageProgress = (stageName, subStage) => {
    const exercises = subStage.exercises || [];
    const completed = exercises.filter(ex => isCompleted(stageName, ex)).length;
    return { completed, total: exercises.length, percent: exercises.length > 0 ? Math.round((completed / exercises.length) * 100) : 0 };
  };

  const canEdit = user?.role === 'admin' || user?.role === 'instructor';

  return (
    <div className="flex">
      <Sidebar />
      <div className="ml-0 md:ml-64 flex-1 p-6 md:p-8 bg-[#F8FAFC] min-h-screen">
        <div className="mb-6">
          <h1 className="text-4xl tracking-tight font-semibold text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>Student Progress</h1>
          <p className="text-sm text-slate-500 mt-2">Track exercise completion per training stage</p>
        </div>

        <div className="mb-6">
          <Label className="text-xs text-slate-500 mb-1 block">Select Student</Label>
          <Select value={selectedStudent} onValueChange={setSelectedStudent}>
            <SelectTrigger data-testid="progress-student-select" className="max-w-sm"><SelectValue placeholder="Choose a student..." /></SelectTrigger>
            <SelectContent>{students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}{s.course ? ` (${s.course.name})` : ''}</SelectItem>)}</SelectContent>
          </Select>
        </div>

        {!selectedStudent ? (
          <Card className="border-slate-200 shadow-sm"><CardContent className="p-12 text-center text-slate-500">Select a student to view their training progress</CardContent></Card>
        ) : (
          <div className="space-y-4">
            {/* Overall Progress Summary */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-2">
              {stages.map(stage => {
                const p = getStageProgress(stage);
                const colors = STAGE_COLORS[stage.name] || { bg: '#f1f5f9', text: '#475569', bar: '#475569' };
                return (
                  <Card key={stage.name} className="border-slate-200 shadow-sm">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <Badge style={{ backgroundColor: colors.bg, color: colors.text }} className="font-bold text-sm">{stage.name}</Badge>
                        <span className="text-lg font-bold" style={{ color: colors.text }}>{p.percent}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${p.percent}%`, backgroundColor: colors.bar }} />
                      </div>
                      <p className="text-[10px] text-slate-400 mt-1">{p.completed}/{p.total} exercises</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Detailed Stage Progress */}
            {stages.map(stage => {
              const colors = STAGE_COLORS[stage.name] || { bg: '#f1f5f9', text: '#475569', bar: '#475569' };
              const p = getStageProgress(stage);
              const isExpanded = expandedStages[stage.name];
              const subStages = stage.sub_stages || [];

              return (
                <Card key={stage.name} className="border-slate-200 shadow-sm overflow-hidden" data-testid={`progress-stage-${stage.name}`}>
                  <div className="flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-slate-50 transition-colors" onClick={() => toggleStage(stage.name)}>
                    <div className="flex items-center gap-3">
                      {isExpanded ? <ChevronDown size={18} className="text-slate-400" /> : <ChevronRight size={18} className="text-slate-400" />}
                      <Badge style={{ backgroundColor: colors.bg, color: colors.text }} className="font-bold">{stage.name}</Badge>
                      <span className="text-sm text-slate-600">{stage.description}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-32 bg-slate-100 rounded-full h-2">
                        <div className="h-2 rounded-full transition-all duration-500" style={{ width: `${p.percent}%`, backgroundColor: colors.bar }} />
                      </div>
                      <span className="text-sm font-medium" style={{ color: colors.text }}>{p.completed}/{p.total}</span>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="border-t border-slate-200">
                      {subStages.length > 0 ? subStages.map(sub => {
                        const subKey = `${stage.name}-${sub.name}`;
                        const subP = getSubStageProgress(stage.name, sub);
                        const isSubExpanded = expandedSubs[subKey] !== false;

                        return (
                          <div key={subKey} className="border-b border-slate-100 last:border-b-0">
                            <div className="flex items-center justify-between px-8 py-2.5 cursor-pointer hover:bg-slate-50/50" onClick={() => toggleSub(subKey)}>
                              <div className="flex items-center gap-2">
                                {isSubExpanded ? <ChevronDown size={14} className="text-slate-300" /> : <ChevronRight size={14} className="text-slate-300" />}
                                <span className="text-xs font-medium text-slate-600">{sub.name}</span>
                              </div>
                              <span className="text-xs text-slate-400">{subP.completed}/{subP.total}</span>
                            </div>
                            {isSubExpanded && (
                              <div className="px-12 pb-3 flex flex-wrap gap-1.5">
                                {sub.exercises.map(ex => {
                                  const done = isCompleted(stage.name, ex);
                                  return (
                                    <button key={ex} onClick={() => canEdit && toggleExercise(stage.name, ex)}
                                      data-testid={`exercise-${stage.name}-${ex}`}
                                      className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${
                                        done ? 'text-white shadow-sm' : 'border hover:shadow-sm'
                                      } ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                      style={done ? { backgroundColor: colors.bar } : { borderColor: `${colors.bar}40`, color: colors.text }}>
                                      {done ? <CheckCircle2 size={12} /> : <Circle size={12} className="opacity-40" />}
                                      {ex}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        );
                      }) : (
                        <div className="px-8 pb-3 pt-2 flex flex-wrap gap-1.5">
                          {(stage.exercises || []).map(ex => {
                            const done = isCompleted(stage.name, ex);
                            return (
                              <button key={ex} onClick={() => canEdit && toggleExercise(stage.name, ex)}
                                data-testid={`exercise-${stage.name}-${ex}`}
                                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-all ${done ? 'text-white shadow-sm' : 'border hover:shadow-sm'} ${canEdit ? 'cursor-pointer' : 'cursor-default'}`}
                                style={done ? { backgroundColor: colors.bar } : { borderColor: `${colors.bar}40`, color: colors.text }}>
                                {done ? <CheckCircle2 size={12} /> : <Circle size={12} className="opacity-40" />}
                                {ex}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
