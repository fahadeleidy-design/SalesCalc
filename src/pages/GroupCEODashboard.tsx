import { useState } from 'react';
import {
  Building2,
  Factory,
  TrendingUp,
  Package,
  Shield,
  Truck,
  ClipboardCheck,
  ArrowRight,
  BarChart3,
  Warehouse
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigation } from '../contexts/NavigationContext';
import CEODashboard from './CEODashboard';

export default function GroupCEODashboard() {
  const { profile } = useAuth();
  const { navigate } = useNavigation();
  const [activeView, setActiveView] = useState<'overview' | 'commercial' | 'manufacturing'>('overview');

  if (!profile || profile.role !== 'group_ceo') {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h2>
          <p className="text-slate-600">This dashboard is only available to the Group CEO.</p>
        </div>
      </div>
    );
  }

  const manufacturingQuickLinks = [
    { label: 'Production Board', icon: Factory, path: '/production-board', color: 'bg-emerald-500' },
    { label: 'Warehouse', icon: Warehouse, path: '/warehouse-operations', color: 'bg-teal-500' },
    { label: 'Quality', icon: Shield, path: '/quality-dashboard', color: 'bg-cyan-500' },
    { label: 'Logistics', icon: Truck, path: '/logistics', color: 'bg-sky-500' },
    { label: 'Purchasing', icon: Package, path: '/purchasing', color: 'bg-blue-500' },
    { label: 'Inspections', icon: ClipboardCheck, path: '/quality-inspections', color: 'bg-slate-500' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Group CEO Command Center</h1>
          <p className="text-slate-600 mt-1">Complete enterprise overview across all divisions</p>
        </div>
        <div className="flex gap-2">
          {(['overview', 'commercial', 'manufacturing'] as const).map((view) => (
            <button
              key={view}
              onClick={() => setActiveView(view)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeView === view
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {view === 'overview' ? 'Overview' : view === 'commercial' ? 'Commercial' : 'Manufacturing'}
            </button>
          ))}
        </div>
      </div>

      {activeView === 'overview' && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <button
              onClick={() => setActiveView('commercial')}
              className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-xl shadow-lg p-6 text-white text-left hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Building2 className="w-8 h-8" />
                </div>
                <ArrowRight className="w-5 h-5 opacity-60" />
              </div>
              <h3 className="text-xl font-bold mb-1">Commercial Operations</h3>
              <p className="text-teal-100 text-sm">Sales, CRM, quotations, targets, commissions, and finance</p>
            </button>

            <button
              onClick={() => setActiveView('manufacturing')}
              className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl shadow-lg p-6 text-white text-left hover:shadow-xl transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-white/20 rounded-lg">
                  <Factory className="w-8 h-8" />
                </div>
                <ArrowRight className="w-5 h-5 opacity-60" />
              </div>
              <h3 className="text-xl font-bold mb-1">Manufacturing Operations</h3>
              <p className="text-emerald-100 text-sm">Production, warehouse, quality, logistics, and purchasing</p>
            </button>
          </div>

          <CEODashboard />
        </>
      )}

      {activeView === 'commercial' && <CEODashboard />}

      {activeView === 'manufacturing' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-xl p-6 text-white">
            <div className="flex items-center gap-3 mb-2">
              <Factory className="w-6 h-6" />
              <h2 className="text-xl font-bold">Manufacturing Division Overview</h2>
            </div>
            <p className="text-emerald-100 text-sm">Quick access to all manufacturing and operations modules</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {manufacturingQuickLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                className="flex flex-col items-center gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-200 hover:shadow-md hover:border-slate-300 transition-all"
              >
                <div className={`p-3 ${link.color} rounded-lg text-white`}>
                  <link.icon className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium text-slate-700 text-center">{link.label}</span>
              </button>
            ))}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <BarChart3 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">Manufacturing Analytics</h3>
            <p className="text-slate-500 mb-4">Navigate to individual modules for detailed manufacturing metrics</p>
            <div className="flex justify-center gap-3">
              <button
                onClick={() => navigate('/production-board')}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium"
              >
                Production Board
              </button>
              <button
                onClick={() => navigate('/quality-dashboard')}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium"
              >
                Quality Dashboard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
