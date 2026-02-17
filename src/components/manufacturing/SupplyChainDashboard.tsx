import React, { useState } from "react";
import {
  ShoppingCart,
  FileText,
  Send,
  TrendingUp,
  TrendingDown,
  Clock,
  DollarSign,
  Truck,
  Package,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  Star,
  ClipboardCheck,
  FileSearch,
  ArrowRight,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

const monthlySpend = [
  { month: "Sep", amount: 1450000 },
  { month: "Oct", amount: 1680000 },
  { month: "Nov", amount: 1520000 },
  { month: "Dec", amount: 1890000 },
  { month: "Jan", amount: 1750000 },
  { month: "Feb", amount: 1820000 },
];

const categorySpend = [
  { name: "Materials", value: 45, color: "#3b82f6" },
  { name: "Equipment", value: 20, color: "#8b5cf6" },
  { name: "Subcontractors", value: 15, color: "#f59e0b" },
  { name: "Services", value: 12, color: "#10b981" },
  { name: "Other", value: 8, color: "#6b7280" },
];

const suppliers = [
  { name: "Al-Rajhi Steel Works", rating: "Preferred", quality: 94, delivery: 96, price: 88, overall: 93, orders: 142, onTime: 96.2 },
  { name: "Gulf Precision Engineering", rating: "Preferred", quality: 91, delivery: 93, price: 85, overall: 90, orders: 98, onTime: 93.4 },
  { name: "Saudi Valve Industries", rating: "Approved", quality: 87, delivery: 88, price: 90, overall: 88, orders: 76, onTime: 88.1 },
  { name: "Jeddah Fasteners Co.", rating: "Approved", quality: 82, delivery: 85, price: 92, overall: 86, orders: 124, onTime: 84.7 },
  { name: "Eastern Coatings LLC", rating: "Conditional", quality: 74, delivery: 71, price: 86, overall: 77, orders: 45, onTime: 71.3 },
  { name: "Riyadh Rubber Products", rating: "Probation", quality: 65, delivery: 62, price: 78, overall: 68, orders: 31, onTime: 61.8 },
];

const poPipeline = [
  { stage: "Draft", count: 3, value: 245000, color: "bg-slate-400", textColor: "text-slate-700", bgLight: "bg-slate-50", border: "border-slate-200" },
  { stage: "Submitted", count: 8, value: 680000, color: "bg-blue-500", textColor: "text-blue-700", bgLight: "bg-blue-50", border: "border-blue-200" },
  { stage: "Approved", count: 12, value: 1420000, color: "bg-amber-500", textColor: "text-amber-700", bgLight: "bg-amber-50", border: "border-amber-200" },
  { stage: "In Transit", count: 15, value: 1890000, color: "bg-purple-500", textColor: "text-purple-700", bgLight: "bg-purple-50", border: "border-purple-200" },
  { stage: "Received", count: 9, value: 1050000, color: "bg-emerald-500", textColor: "text-emerald-700", bgLight: "bg-emerald-50", border: "border-emerald-200" },
];

const rfqs = [
  { id: "RFQ-2025-041", title: "Structural Steel Beams - Phase 3", type: "Competitive", items: 8, deadline: "2025-02-28", responses: 4, status: "responses_received" },
  { id: "RFQ-2025-039", title: "Hydraulic Pump Assembly Units", type: "Single Source", items: 3, deadline: "2025-03-05", responses: 1, status: "under_evaluation" },
  { id: "RFQ-2025-037", title: "Electrical Cable Supply - Annual", type: "Framework", items: 22, deadline: "2025-03-10", responses: 6, status: "issued" },
  { id: "RFQ-2025-035", title: "Safety Equipment & PPE", type: "Competitive", items: 15, deadline: "2025-02-20", responses: 5, status: "awarded" },
];

const grns = [
  { id: "GRN-2025-0198", supplier: "Al-Rajhi Steel Works", po: "PO-2025-0312", date: "2025-02-15", items: 12, inspection: "passed", status: "completed" },
  { id: "GRN-2025-0197", supplier: "Gulf Precision Engineering", po: "PO-2025-0308", date: "2025-02-14", items: 5, inspection: "pending", status: "in_progress" },
  { id: "GRN-2025-0196", supplier: "Jeddah Fasteners Co.", po: "PO-2025-0305", date: "2025-02-13", items: 24, inspection: "partial", status: "in_progress" },
  { id: "GRN-2025-0195", supplier: "Saudi Valve Industries", po: "PO-2025-0301", date: "2025-02-12", items: 8, inspection: "passed", status: "completed" },
  { id: "GRN-2025-0194", supplier: "Eastern Coatings LLC", po: "PO-2025-0298", date: "2025-02-11", items: 3, inspection: "failed", status: "on_hold" },
];

const contracts = [
  { name: "Annual Steel Supply Agreement", supplier: "Al-Rajhi Steel Works", expiry: "2025-03-10", remaining: "420,000 SAR", daysLeft: 21 },
  { name: "Maintenance Services Contract", supplier: "Gulf Precision Engineering", expiry: "2025-04-15", remaining: "185,000 SAR", daysLeft: 57 },
  { name: "PPE Framework Agreement", supplier: "Jeddah Fasteners Co.", expiry: "2025-06-30", remaining: "92,000 SAR", daysLeft: 133 },
];

const ratingConfig: Record<string, { bg: string; text: string }> = {
  Preferred: { bg: "bg-emerald-100", text: "text-emerald-700" },
  Approved: { bg: "bg-blue-100", text: "text-blue-700" },
  Conditional: { bg: "bg-amber-100", text: "text-amber-700" },
  Probation: { bg: "bg-red-100", text: "text-red-700" },
};

const rfqStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  issued: { bg: "bg-blue-100", text: "text-blue-700", label: "Issued" },
  responses_received: { bg: "bg-amber-100", text: "text-amber-700", label: "Responses Received" },
  under_evaluation: { bg: "bg-cyan-100", text: "text-cyan-700", label: "Under Evaluation" },
  awarded: { bg: "bg-green-100", text: "text-green-700", label: "Awarded" },
};

const inspectionConfig: Record<string, { bg: string; text: string; label: string }> = {
  pending: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending" },
  passed: { bg: "bg-green-100", text: "text-green-700", label: "Passed" },
  failed: { bg: "bg-red-100", text: "text-red-700", label: "Failed" },
  partial: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Partial" },
};

const grnStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
  in_progress: { bg: "bg-blue-100", text: "text-blue-700", label: "In Progress" },
  on_hold: { bg: "bg-red-100", text: "text-red-700", label: "On Hold" },
};

const rfqTypeConfig: Record<string, { bg: string; text: string }> = {
  Competitive: { bg: "bg-blue-100", text: "text-blue-700" },
  "Single Source": { bg: "bg-purple-100", text: "text-purple-700" },
  Framework: { bg: "bg-teal-100", text: "text-teal-700" },
};

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-50";
  if (score >= 70) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function formatCurrency(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toString();
}

export default function SupplyChainDashboard() {
  const [activeTab, setActiveTab] = useState<"spend" | "rfq" | "grn">("spend");

  const metrics = [
    { label: "Active POs", value: "47", trend: "+5", trendUp: true, icon: ShoppingCart, color: "text-blue-600", bg: "bg-blue-50", borderColor: "border-blue-200" },
    { label: "Pending Requisitions", value: "12", trend: "+3", trendUp: false, icon: FileText, color: "text-amber-600", bg: "bg-amber-50", borderColor: "border-amber-200" },
    { label: "Open RFQs", value: "5", trend: "-2", trendUp: true, icon: Send, color: "text-purple-600", bg: "bg-purple-50", borderColor: "border-purple-200" },
    { label: "On-Time Delivery Rate", value: "91.2%", trend: "+1.8%", trendUp: true, icon: Truck, color: "text-emerald-600", bg: "bg-emerald-50", borderColor: "border-emerald-200" },
    { label: "Avg Lead Time", value: "14 days", trend: "-2d", trendUp: true, icon: Clock, color: "text-teal-600", bg: "bg-teal-50", borderColor: "border-teal-200" },
    { label: "Spend This Month", value: "1.8M SAR", trend: "+4.1%", trendUp: false, icon: DollarSign, color: "text-red-600", bg: "bg-red-50", borderColor: "border-red-200" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supply Chain & Purchasing</h1>
          <p className="text-sm text-slate-500 mt-1">Procurement Management Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <Package className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-500">Last updated: Feb 17, 2025 10:30 AM</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className={`bg-white rounded-xl border ${m.borderColor} p-4 space-y-3`}>
            <div className="flex items-center justify-between">
              <div className={`p-2 rounded-lg ${m.bg}`}>
                <m.icon className={`w-5 h-5 ${m.color}`} />
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${m.trendUp ? "text-emerald-600" : "text-red-500"}`}>
                {m.trendUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {m.trend}
              </div>
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{m.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Supplier Performance</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 text-slate-500 font-medium">Supplier</th>
                <th className="text-left py-3 px-3 text-slate-500 font-medium">Rating</th>
                <th className="text-center py-3 px-3 text-slate-500 font-medium">Quality</th>
                <th className="text-center py-3 px-3 text-slate-500 font-medium">Delivery</th>
                <th className="text-center py-3 px-3 text-slate-500 font-medium">Price</th>
                <th className="text-center py-3 px-3 text-slate-500 font-medium">Overall</th>
                <th className="text-center py-3 px-3 text-slate-500 font-medium">Orders</th>
                <th className="text-center py-3 px-3 text-slate-500 font-medium">On-Time %</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => {
                const r = ratingConfig[s.rating];
                return (
                  <tr key={s.name} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-3 px-3 font-medium text-slate-900">{s.name}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${r.bg} ${r.text}`}>{s.rating}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor(s.quality)}`}>{s.quality}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor(s.delivery)}`}>{s.delivery}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor(s.price)}`}>{s.price}</span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2.5 py-1 rounded text-xs font-bold ${scoreColor(s.overall)}`}>{s.overall}</span>
                    </td>
                    <td className="py-3 px-3 text-center text-slate-700">{s.orders}</td>
                    <td className="py-3 px-3 text-center">
                      <span className={`text-xs font-semibold ${s.onTime >= 90 ? "text-emerald-600" : s.onTime >= 80 ? "text-amber-600" : "text-red-600"}`}>{s.onTime}%</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Purchase Order Pipeline</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {poPipeline.map((stage, idx) => (
            <React.Fragment key={stage.stage}>
              <div className={`flex-1 min-w-[160px] rounded-xl border ${stage.border} ${stage.bgLight} p-4`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 rounded-full ${stage.color}`} />
                  <span className={`text-sm font-semibold ${stage.textColor}`}>{stage.stage}</span>
                </div>
                <p className="text-2xl font-bold text-slate-900">{stage.count}</p>
                <p className="text-xs text-slate-500 mt-1">{formatCurrency(stage.value)} SAR</p>
              </div>
              {idx < poPipeline.length - 1 && (
                <ChevronRight className="w-5 h-5 text-slate-300 flex-shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      <div className="flex gap-2 border-b border-slate-200">
        {[
          { key: "spend" as const, label: "Spend Analytics", icon: DollarSign },
          { key: "rfq" as const, label: "RFQ Management", icon: FileSearch },
          { key: "grn" as const, label: "Goods Receipt", icon: ClipboardCheck },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-600 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "spend" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Monthly Spend (SAR)</h2>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={monthlySpend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 12, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(value: number) => [`${(value / 1000000).toFixed(2)}M SAR`, "Spend"]} />
                <Bar dataKey="amount" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">Spend by Category</h2>
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie data={categorySpend} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                  {categorySpend.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}%`, "Share"]} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {activeTab === "rfq" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Active RFQs</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">RFQ #</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Title</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Type</th>
                  <th className="text-center py-3 px-3 text-slate-500 font-medium">Items</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Deadline</th>
                  <th className="text-center py-3 px-3 text-slate-500 font-medium">Responses</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {rfqs.map((rfq) => {
                  const st = rfqStatusConfig[rfq.status];
                  const tp = rfqTypeConfig[rfq.type];
                  return (
                    <tr key={rfq.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-xs font-medium text-blue-600">{rfq.id}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">{rfq.title}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tp.bg} ${tp.text}`}>{rfq.type}</span>
                      </td>
                      <td className="py-3 px-3 text-center text-slate-700">{rfq.items}</td>
                      <td className="py-3 px-3 text-slate-700">{rfq.deadline}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{rfq.responses}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "grn" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Recent Goods Receipt Notes</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">GRN #</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Supplier</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">PO Ref</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Date</th>
                  <th className="text-center py-3 px-3 text-slate-500 font-medium">Items</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Inspection</th>
                  <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {grns.map((grn) => {
                  const insp = inspectionConfig[grn.inspection];
                  const st = grnStatusConfig[grn.status];
                  return (
                    <tr key={grn.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-3 font-mono text-xs font-medium text-blue-600">{grn.id}</td>
                      <td className="py-3 px-3 font-medium text-slate-900">{grn.supplier}</td>
                      <td className="py-3 px-3 font-mono text-xs text-slate-600">{grn.po}</td>
                      <td className="py-3 px-3 text-slate-700">{grn.date}</td>
                      <td className="py-3 px-3 text-center text-slate-700">{grn.items}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${insp.bg} ${insp.text}`}>{insp.label}</span>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <h2 className="text-base font-semibold text-slate-900">Contract Alerts</h2>
        </div>
        <div className="space-y-3">
          {contracts.map((c) => {
            const urgent = c.daysLeft < 30;
            const warning = c.daysLeft < 90;
            const borderClass = urgent ? "border-red-300 bg-red-50" : warning ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50";
            const badgeClass = urgent ? "bg-red-100 text-red-700" : warning ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-600";
            return (
              <div key={c.name} className={`rounded-lg border ${borderClass} p-4 flex items-center justify-between`}>
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.supplier}</p>
                </div>
                <div className="text-right space-y-1">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                    {c.daysLeft} days left
                  </span>
                  <p className="text-xs text-slate-500">Remaining: {c.remaining}</p>
                  <p className="text-xs text-slate-400">Expires: {c.expiry}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
