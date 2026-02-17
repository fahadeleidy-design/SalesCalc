import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const { signIn } = useAuth();

  // Signup form state
  const [signupData, setSignupData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    full_name: '',
    phone: '',
    requested_role: 'sales',
    department: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        const msg = error.message || String(error);
        if (msg.includes('Email not confirmed')) {
          setError('Please check your email and confirm your account before logging in.');
        } else if (msg.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please try again.');
        } else {
          setError(msg);
        }
      }
    } catch (err: any) {
      setError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate password match
    if (signupData.password !== signupData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (signupData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Create auth user with metadata
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: signupData.full_name,
            phone: signupData.phone || null,
            department: signupData.department || null,
            requested_role: signupData.requested_role,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Wait for trigger to create profile, then update with pending status and additional fields
        await new Promise(resolve => setTimeout(resolve, 500));

        const { error: profileError } = await (supabase as any)
          .from('profiles')
          .update({
            phone: signupData.phone || null,
            department: signupData.department || null,
            requested_role: signupData.requested_role,
            account_status: 'pending',
          })
          .eq('user_id', authData.user.id);

        if (profileError) {
          console.error('Profile update error:', profileError);
          // Don't throw error here - profile was created by trigger
        }

        const submittedEmail = signupData.email;

        setSignupData({
          email: '',
          password: '',
          confirmPassword: '',
          full_name: '',
          phone: '',
          requested_role: 'sales',
          department: '',
        });
        setShowSignup(false);
        setEmail(submittedEmail);

        toast.success('Account created successfully! Waiting for admin approval.', { duration: 6000 });
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      const msg = err?.message || String(err);
      if (msg.includes('already registered') || msg.includes('already been registered')) {
        setError('This email is already registered. Please use the login form or try a different email.');
      } else {
        setError(`Registration failed: ${msg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.svg" alt="Special Offices" className="h-16 w-auto mb-4" />
          <p className="text-slate-600 mt-2">Sales Quotation System</p>
        </div>

        {/* Multi-Tab Support Banner */}
        {!showSignup && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-green-800 font-medium mb-1">
              ✅ Multi-Tab Sessions Enabled
            </p>
            <p className="text-xs text-green-700">
              You can now login with different users in different tabs of the same browser.
            </p>
          </div>
        )}

        {!showSignup ? (
          <>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-colors"
                  placeholder="Enter your password"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-6 border-t pt-6 text-center">
              <p className="text-sm text-slate-600 mb-3">Don't have an account?</p>
              <button
                onClick={() => {
                  setShowSignup(true);
                  setError('');
                }}
                className="text-orange-500 hover:text-orange-600 font-medium text-sm transition-colors"
              >
                Request Account Creation →
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Fill the form and admin will approve your account
              </p>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-slate-900 text-lg">Request Account</h3>
              <button
                onClick={() => {
                  setShowSignup(false);
                  setError('');
                }}
                className="text-slate-500 hover:text-slate-700 text-sm"
              >
                ← Back to Login
              </button>
            </div>

            <form onSubmit={handleSignup} className="space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <p className="text-xs text-blue-800">
                  Your account will be reviewed by an administrator before you can access the system.
                </p>
              </div>

              <div>
                <label htmlFor="signup-name" className="block text-sm font-medium text-slate-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={signupData.full_name}
                  onChange={(e) => setSignupData({ ...signupData, full_name: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="John Smith"
                  required
                />
              </div>

              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-slate-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={signupData.email}
                  onChange={(e) => setSignupData({ ...signupData, email: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="john@company.com"
                  required
                />
              </div>

              <div>
                <label htmlFor="signup-phone" className="block text-sm font-medium text-slate-700 mb-2">
                  Phone Number
                </label>
                <input
                  id="signup-phone"
                  type="tel"
                  value={signupData.phone}
                  onChange={(e) => setSignupData({ ...signupData, phone: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="+966 50 123 4567"
                />
              </div>

              <div>
                <label htmlFor="signup-department" className="block text-sm font-medium text-slate-700 mb-2">
                  Department
                </label>
                <input
                  id="signup-department"
                  type="text"
                  value={signupData.department}
                  onChange={(e) => setSignupData({ ...signupData, department: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Sales Department"
                />
              </div>

              <div>
                <label htmlFor="signup-role" className="block text-sm font-medium text-slate-700 mb-2">
                  Requested Role <span className="text-red-500">*</span>
                </label>
                <select
                  id="signup-role"
                  value={signupData.requested_role}
                  onChange={(e) => setSignupData({ ...signupData, requested_role: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 bg-white"
                  required
                >
                  <option value="sales">Sales Representative</option>
                  <option value="manager">Sales Manager</option>
                  <option value="engineering">Engineering Team</option>
                  <option value="finance">Finance Team</option>
                </select>
              </div>

              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-slate-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={signupData.password}
                  onChange={(e) => setSignupData({ ...signupData, password: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                />
              </div>

              <div>
                <label htmlFor="signup-confirm-password" className="block text-sm font-medium text-slate-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  id="signup-confirm-password"
                  type="password"
                  value={signupData.confirmPassword}
                  onChange={(e) => setSignupData({ ...signupData, confirmPassword: e.target.value })}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  placeholder="Re-enter password"
                  required
                  minLength={6}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-orange-500 hover:bg-orange-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Submitting...' : 'Submit Account Request'}
              </button>

              <p className="text-xs text-slate-500 text-center mt-3">
                An administrator will review your request and approve your account.
              </p>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
