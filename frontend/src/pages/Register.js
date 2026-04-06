import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Plane } from 'lucide-react';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('student');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const result = await register(email, password, name, role);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      <div
        className="hidden lg:flex lg:w-1/2 bg-cover bg-center relative"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1723104450759-c83b0bddebe9?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjY2NzF8MHwxfHNlYXJjaHwyfHxwaWxvdCUyMGRhc2hib2FyZCUyMGJhY2tncm91bmR8ZW58MHx8fHwxNzc1NDc1NzQ5fDA&ixlib=rb-4.1.0&q=85')",
        }}
      >
        <div className="absolute inset-0 bg-[#0B192C]/60 backdrop-blur-sm"></div>
        <div className="relative z-10 flex flex-col justify-center p-12 text-white">
          <h1 className="text-5xl font-bold mb-4" style={{ fontFamily: 'Outfit, sans-serif' }}>
            Join Flight Ops
          </h1>
          <p className="text-xl text-slate-200">Create your account to start managing flights</p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 bg-[#F8FAFC]">
        <div className="w-full max-w-md">
          <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-[#F4A261]/10 rounded-lg">
                <Plane className="text-[#F4A261]" size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-[#0B192C]" style={{ fontFamily: 'Outfit, sans-serif' }}>
                  Create Account
                </h2>
                <p className="text-sm text-slate-500">Sign up to get started</p>
              </div>
            </div>

            {error && (
              <div data-testid="register-error" className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-sm">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-[#0B192C] font-medium">
                  Full Name
                </Label>
                <Input
                  id="name"
                  type="text"
                  data-testid="name-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="mt-1 border-slate-200 focus:ring-[#F4A261]/50"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="email" className="text-[#0B192C] font-medium">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  data-testid="email-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 border-slate-200 focus:ring-[#F4A261]/50"
                  placeholder="your@email.com"
                />
              </div>

              <div>
                <Label htmlFor="password" className="text-[#0B192C] font-medium">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  data-testid="password-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="mt-1 border-slate-200 focus:ring-[#F4A261]/50"
                  placeholder="••••••••"
                />
              </div>

              <div>
                <Label htmlFor="role" className="text-[#0B192C] font-medium">
                  Role
                </Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger data-testid="role-select" className="mt-1 border-slate-200">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Student</SelectItem>
                    <SelectItem value="instructor">Instructor</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="submit"
                data-testid="register-submit-button"
                disabled={loading}
                className="w-full bg-[#F4A261] text-white hover:bg-[#E78A43] transition-colors rounded-lg py-2 font-medium shadow-sm"
              >
                {loading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-600">
              Already have an account?{' '}
              <Link to="/login" className="text-[#F4A261] hover:text-[#E78A43] font-medium">
                Sign in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}