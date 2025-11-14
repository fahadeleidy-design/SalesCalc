import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import toast from 'react-hot-toast';
import MultiUserWarning from '../components/auth/MultiUserWarning';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [showMultiUserWarning, setShowMultiUserWarning] = useState(false);
  const { signIn, user, profile } = useAuth();

  // Show warning if user is already logged in
  useEffect(() => {
    if (user && email && email !== user.email) {
      setShowMultiUserWarning(true);
    }
  }, [user, email]);

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

    const { error } = await signIn(email, password);

    if (error) {
      if (error.message.includes('Email not confirmed')) {
        setError('Please check your email and confirm your account before logging in.');
      } else if (error.message.includes('Invalid login credentials')) {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(error.message);
      }
    }

    setLoading(false);
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
      // Create auth user
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            full_name: signupData.full_name,
          }
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        // Create profile with pending status
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: authData.user.id,
            user_id: authData.user.id,
            email: signupData.email,
            full_name: signupData.full_name,
            phone: signupData.phone || null,
            department: signupData.department || null,
            requested_role: signupData.requested_role,
            role: 'sales', // Default role, will be changed on approval
            account_status: 'pending',
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }

        // Success message
        toast.success('Account created successfully! Waiting for admin approval.', { duration: 5000 });

        // Reset form and switch to login
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
        setEmail(signupData.email);

        alert(
          '✅ Account Registration Submitted!\n\n' +
          'Your account has been created and is pending admin approval.\n\n' +
          'You will be notified once an administrator reviews and approves your account.\n\n' +
          'Email: ' + signupData.email
        );
      }
    } catch (err: any) {
      console.error('Signup error:', err);
      if (err.message.includes('already registered') || err.message.includes('already been registered')) {
        setError('This email is already registered. Please use the login form or try a different email.');
      } else {
        setError(`Registration failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <MultiUserWarning
        isOpen={showMultiUserWarning}
        onClose={() => setShowMultiUserWarning(false)}
        currentUser={profile?.email}
        newUser={email}
      />

      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
          <div className="flex flex-col items-center mb-8">
            <img src="/logo.svg" alt="Special Offices" className="h-16 w-auto mb-4" />
            <p className="text-slate-600 mt-2">Sales Quotation System</p>
          </div>

          {/* Multi-User Info Banner */}
          {!showSignup && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-blue-800 font-medium mb-1">
                Testing Multiple Users?
              </p>
              <p className="text-xs text-blue-700">
                Use incognito windows or different browsers for each user to avoid session conflicts.
                <button
                  onClick={() => setShowMultiUserWarning(true)}
                  className="text-blue-600 underline hover:text-blue-800 ml-1"
                >
                  Learn more
                </button>
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
    </>
  );
}
