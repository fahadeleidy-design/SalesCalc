import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Building2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const demoAccounts = [
  { email: 'admin@special-offices.com', role: 'admin', name: 'Admin User', target: 0 },
  { email: 'sales@special-offices.com', role: 'sales', name: 'Sales Representative', target: 100000 },
  { email: 'engineering@special-offices.com', role: 'engineering', name: 'Engineering Team', target: 0 },
  { email: 'manager@special-offices.com', role: 'manager', name: 'Sales Manager', target: 0 },
  { email: 'ceo@special-offices.com', role: 'ceo', name: 'Chief Executive Officer', target: 0 },
  { email: 'finance@special-offices.com', role: 'finance', name: 'Finance Team', target: 0 },
];

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showSignup, setShowSignup] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState(demoAccounts[0]);
  const { signIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  const handleCreateAccount = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: selectedAccount.email,
        password: 'demo123',
        options: {
          emailRedirectTo: window.location.origin,
        }
      });

      if (signUpError) throw signUpError;

      if (authData.user) {
        const { error: profileError } = await supabase
          .from('profiles')
      // @ts-expect-error - Supabase type inference issue
          .insert({
            user_id: authData.user.id,
            email: selectedAccount.email,
            full_name: selectedAccount.name,
            role: selectedAccount.role,
            sales_target: selectedAccount.target,
          });

        if (profileError) {
          console.error('Profile creation error:', profileError);
          throw profileError;
        }

        if (authData.session) {
          alert(`✅ Account created and logged in!\n\nEmail: ${selectedAccount.email}\n\nRefreshing page...`);
          window.location.reload();
        } else {
          alert(`✅ Account created!\n\nEmail: ${selectedAccount.email}\nPassword: demo123\n\nNote: Email confirmation may be required. Check your Supabase settings.\n\nTry logging in now.`);
          setShowSignup(false);
          setEmail(selectedAccount.email);
          setPassword('demo123');
        }
      }
    } catch (err: any) {
      if (err.message.includes('already registered') || err.message.includes('already been registered')) {
        setError('This account already exists. Use the login form above.');
      } else {
        console.error('Signup error:', err);
        setError(`Error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8">
        <div className="flex flex-col items-center mb-8">
          <div className="bg-blue-600 p-3 rounded-xl mb-4">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Special Offices</h1>
          <p className="text-slate-600 mt-1">Sales Quotation System</p>
        </div>

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
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
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
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 border-t pt-6">
          {!showSignup ? (
            <div className="text-center">
              <p className="text-sm text-slate-600 mb-3">Don't have demo accounts yet?</p>
              <button
                onClick={() => setShowSignup(true)}
                className="text-blue-600 hover:text-blue-700 font-medium text-sm transition-colors"
              >
                Create Demo Accounts →
              </button>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-slate-900">Create Demo Account</h3>
                <button
                  onClick={() => {
                    setShowSignup(false);
                    setError('');
                  }}
                  className="text-slate-500 hover:text-slate-700 text-sm"
                >
                  ← Back
                </button>
              </div>

              <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
                {demoAccounts.map((account) => (
                  <label
                    key={account.email}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedAccount.email === account.email
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="account"
                      checked={selectedAccount.email === account.email}
                      onChange={() => setSelectedAccount(account)}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm text-slate-900">{account.name}</div>
                      <div className="text-xs text-slate-600 truncate">{account.email}</div>
                      <div className="text-xs text-slate-500">Role: {account.role}</div>
                    </div>
                  </label>
                ))}
              </div>

              <button
                onClick={handleCreateAccount}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : `Create ${selectedAccount.role} account`}
              </button>

              <p className="text-xs text-slate-500 mt-3 text-center">
                Password will be: demo123
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
