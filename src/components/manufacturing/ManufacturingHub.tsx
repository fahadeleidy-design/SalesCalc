import React, { useState } from 'react';
import { Factory, ClipboardList, BarChart3, ShieldCheck, Truck, Package, TrendingUp, AlertTriangle, Plus, Wrench, ArrowRightLeft, CalendarClock } from 'lucide-react';
import WorkOrderManagement from './WorkOrderManagement';
import OEEDashboard from './OEEDashboard';
import QualityControlDashboard from './QualityControlDashboard';
import SupplyChainDashboard from './SupplyChainDashboard';
import LogisticsOperationsDashboard from './LogisticsOperationsDashboard';

const tabs = [
  { id: 'overview', label: 'Production', icon: Factory },
  { id: 'work-orders', label: 'Work Orders', icon: ClipboardList },
  { id: 'oee', label: 'OEE Analytics', icon: BarChart3 },
  { id: 'quality', label: 'Quality Control', icon: ShieldCheck },
  { id: 'supply-chain', label: 'Supply Chain', icon: Truck },
  { id: 'logistics', label: 'Logistics', icon: Package },
];

const kpis = [
  { label: 'Total Work Orders', value: '156', color: 'bg-blue-50 text-blue-700', accent: 'bg-blue-500' },
  { label: 'Active Production', value: '34', color: 'bg-emerald-50 text-emerald-700', accent: 'bg-emerald-500' },
  { label: 'OEE Average', value: '78.5%', color: 'bg-violet-50 text-violet-700', accent: 'bg-violet-500' },
  { label: 'Quality FPY', value: '96.8%', color: 'bg-teal-50 text-teal-700', accent: 'bg-teal-500' },
  { label: 'On-Time Delivery', value: '93.5%', color: 'bg-amber-50 text-amber-700', accent: 'bg-amber-500' },
  { label: 'Active Suppliers', value: '42', color: 'bg-indigo-50 text-indigo-700', accent: 'bg-indigo-500' },
  { label: 'Open NCRs', value: '8', color: 'bg-red-50 text-red-700', accent: 'bg-red-500' },
  { label: 'Inventory Accuracy', value: '98.2%', color: 'bg-cyan-50 text-cyan-700', accent: 'bg-cyan-500' },
];

const statuses = [
  { label: 'Draft', count: 12, max: 72, color: 'bg-slate-400' },
  { label: 'Planned', count: 18, max: 72, color: 'bg-blue-500' },
  { label: 'In Progress', count: 34, max: 72, color: 'bg-emerald-500' },
  { label: 'Completed', count: 72, max: 72, color: 'bg-green-600' },
  { label: 'On Hold', count: 8, max: 72, color: 'bg-amber-500' },
];

const quickActions = [
  { label: 'New Work Order', icon: Plus, color: 'bg-blue-100 text-blue-700 hover:bg-blue-200' },
  { label: 'Create BOM', icon: ClipboardList, color: 'bg-violet-100 text-violet-700 hover:bg-violet-200' },
  { label: 'Log Quality Check', icon: ShieldCheck, color: 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200' },
  { label: 'New Shipment', icon: Truck, color: 'bg-amber-100 text-amber-700 hover:bg-amber-200' },
  { label: 'Stock Transfer', icon: ArrowRightLeft, color: 'bg-cyan-100 text-cyan-700 hover:bg-cyan-200' },
  { label: 'Schedule Maintenance', icon: CalendarClock, color: 'bg-red-100 text-red-700 hover:bg-red-200' },
];

function OverviewTab() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className={`rounded-xl p-4 ${kpi.color}`}>
            <div className={`w-1 h-8 rounded-full ${kpi.accent} mb-3`} />
            <p className="text-sm font-medium opacity-80">{kpi.label}</p>
            <p className="text-2xl font-bold mt-1">{kpi.value}</p>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Production Status
          </h3>
          <div className="space-y-4">
            {statuses.map((status) => (
              <div key={status.label} className="space-y-1">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">{status.label}</span>
                  <span className="text-slate-800 font-semibold">{status.count}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`h-2.5 rounded-full ${status.color}`}
                    style={{ width: `${(status.count / status.max) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <h3 className="text-lg font-semibold text-slate-800 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            Quick Actions
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${action.color}`}
                >
                  <Icon className="w-4 h-4" />
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function ManufacturingHub() {
  const [activeTab, setActiveTab] = useState('overview');

  const renderContent = () => {
    switch (activeTab) {
      case 'work-orders':
        return <WorkOrderManagement />;
      case 'oee':
        return <OEEDashboard />;
      case 'quality':
        return <QualityControlDashboard />;
      case 'supply-chain':
        return <SupplyChainDashboard />;
      case 'logistics':
        return <LogisticsOperationsDashboard />;
      default:
        return <OverviewTab />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Factory className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Manufacturing Operations Center</h1>
              <p className="text-sm text-slate-500">Monitor production, quality, and supply chain operations</p>
            </div>
          </div>
        </div>
      </div>
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex overflow-x-auto scrollbar-hide -mb-px" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors ${
                    isActive
                      ? 'border-blue-600 text-blue-600 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {renderContent()}
      </main>
    </div>
  );
}

export default ManufacturingHub;
