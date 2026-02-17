import React, { useState } from "react";
import {
  CheckCircle2,
  AlertTriangle,
  FileWarning,
  ClipboardList,
  MessageSquareWarning,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Shield,
  Search,
  Filter,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  ComposedChart,
  Dot,
} from "recharts";

const qualityTrend = Array.from({ length: 12 }, (_, i) => ({
  week: `W${i + 1}`,
  fpy: parseFloat((95 + Math.random() * 3).toFixed(2)),
  defectPPM: Math.round(2800 + Math.random() * 1000),
  target: 97,
}));

const spcData = Array.from({ length: 20 }, (_, i) => ({
  sample: i + 1,
  value: parseFloat((25 + (Math.random() - 0.5) * 2).toFixed(2)),
  ucl: 26.5,
  lcl: 23.5,
  cl: 25,
}));
spcData[7].value = 27.1;
spcData[14].value = 23.1;

const defectPareto = [
  { type: "Surface Finish", count: 32, cumulative: 32 },
  { type: "Dimensional", count: 24, cumulative: 56 },
  { type: "Assembly", count: 18, cumulative: 74 },
  { type: "Paint", count: 14, cumulative: 88 },
  { type: "Material", count: 8, cumulative: 96 },
  { type: "Other", count: 4, cumulative: 100 },
];

const ncrData = [
  { id: "NCR-2024-0142", product: "Valve Assembly VA-200", type: "Process", severity: "critical", disposition: "Rework", reported: "2024-12-01", status: "open", assignedTo: "Ahmed K." },
  { id: "NCR-2024-0139", product: "Pump Housing PH-110", type: "Material", severity: "major", disposition: "MRB Review", reported: "2024-11-28", status: "investigating", assignedTo: "Sara M." },
  { id: "NCR-2024-0137", product: "Bearing Cap BC-050", type: "Dimensional", severity: "minor", disposition: "Use As-Is", reported: "2024-11-25", status: "pending-review", assignedTo: "Khalid R." },
  { id: "NCR-2024-0135", product: "Shaft Coupling SC-300", type: "Surface", severity: "major", disposition: "Return to Supplier", reported: "2024-11-22", status: "open", assignedTo: "Omar T." },
  { id: "NCR-2024-0133", product: "Flange Plate FP-080", type: "Assembly", severity: "observation", disposition: "Accept", reported: "2024-11-20", status: "closed", assignedTo: "Fatima A." },
  { id: "NCR-2024-0130", product: "Gear Box GB-450", type: "Paint", severity: "minor", disposition: "Rework", reported: "2024-11-18", status: "investigating", assignedTo: "Yusuf H." },
];

const capaData = [
  { id: "CAPA-2024-031", type: "corrective", source: "NCR-2024-0142", risk: "high", status: "investigation", targetDate: "2025-01-15", assignedTo: "Ahmed K." },
  { id: "CAPA-2024-029", type: "preventive", source: "Audit Finding #12", risk: "medium", status: "implementation", targetDate: "2025-01-10", assignedTo: "Sara M." },
  { id: "CAPA-2024-027", type: "corrective", source: "Customer Complaint", risk: "high", status: "verification", targetDate: "2024-12-30", assignedTo: "Omar T." },
  { id: "CAPA-2024-025", type: "preventive", source: "Trend Analysis", risk: "low", status: "planning", targetDate: "2025-02-01", assignedTo: "Khalid R." },
  { id: "CAPA-2024-023", type: "corrective", source: "NCR-2024-0130", risk: "medium", status: "investigation", targetDate: "2025-01-20", assignedTo: "Fatima A." },
];

const capaPipeline = [
  { stage: "Planning", count: 2, color: "bg-slate-400" },
  { stage: "Investigation", count: 4, color: "bg-blue-500" },
  { stage: "Implementation", count: 3, color: "bg-amber-500" },
  { stage: "Verification", count: 2, color: "bg-emerald-500" },
  { stage: "Closure", count: 1, color: "bg-green-700" },
];

const severityConfig: Record<string, { bg: string; text: string; label: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700", label: "Critical" },
  major: { bg: "bg-orange-100", text: "text-orange-700", label: "Major" },
  minor: { bg: "bg-blue-100", text: "text-blue-700", label: "Minor" },
  observation: { bg: "bg-gray-100", text: "text-gray-600", label: "Observation" },
};

const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
  open: { bg: "bg-red-100", text: "text-red-700", label: "Open" },
  investigating: { bg: "bg-amber-100", text: "text-amber-700", label: "Investigating" },
  "pending-review": { bg: "bg-blue-100", text: "text-blue-700", label: "Pending Review" },
  closed: { bg: "bg-green-100", text: "text-green-700", label: "Closed" },
};

const riskConfig: Record<string, { bg: string; text: string }> = {
  high: { bg: "bg-red-100", text: "text-red-700" },
  medium: { bg: "bg-amber-100", text: "text-amber-700" },
  low: { bg: "bg-green-100", text: "text-green-700" },
};

const SpcDot = (props: any) => {
  const { cx, cy, payload } = props;
  if (!payload) return null;
  const isOutOfControl = payload.value > payload.ucl || payload.value < payload.lcl;
  return (
    <Dot
      cx={cx}
      cy={cy}
      r={isOutOfControl ? 6 : 3}
      fill={isOutOfControl ? "#ef4444" : "#3b82f6"}
      stroke={isOutOfControl ? "#ef4444" : "#3b82f6"}
    />
  );
};

export default function QualityControlDashboard() {
  const [ncrFilter, setNcrFilter] = useState("");

  const metrics = [
    { label: "First Pass Yield", value: "96.8%", trend: "+0.3%", trendUp: true, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50", borderColor: "border-emerald-200" },
    { label: "Defect Rate (PPM)", value: "3,200", trend: "-150", trendUp: true, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-50", borderColor: "border-amber-200" },
    { label: "CAPA Actions Open", value: "12", trend: "+2", trendUp: false, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50", borderColor: "border-blue-200" },
    { label: "NCRs This Month", value: "8", trend: "-3", trendUp: true, icon: FileWarning, color: "text-red-600", bg: "bg-red-50", borderColor: "border-red-200" },
    { label: "Customer Complaints", value: "3", trend: "-1", trendUp: true, icon: MessageSquareWarning, color: "text-purple-600", bg: "bg-purple-50", borderColor: "border-purple-200" },
    { label: "Cost of Quality", value: "45,200 SAR", trend: "-2,100", trendUp: true, icon: DollarSign, color: "text-teal-600", bg: "bg-teal-50", borderColor: "border-teal-200" },
  ];

  const inspections = [
    { label: "Incoming", passed: 42, failed: 3, color: "bg-blue-500" },
    { label: "In-Process", passed: 156, failed: 8, color: "bg-amber-500" },
    { label: "Final", passed: 89, failed: 2, color: "bg-emerald-500" },
    { label: "Audit", passed: 12, failed: 0, color: "bg-purple-500", isAudit: true },
  ];

  const filteredNcrs = ncrData.filter(
    (ncr) =>
      ncr.id.toLowerCase().includes(ncrFilter.toLowerCase()) ||
      ncr.product.toLowerCase().includes(ncrFilter.toLowerCase()) ||
      ncr.assignedTo.toLowerCase().includes(ncrFilter.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Control Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manufacturing Quality Management System</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-500">Last updated: Dec 3, 2024 09:15 AM</span>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Quality Trend - Last 12 Weeks</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={qualityTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="week" fontSize={12} tick={{ fill: "#64748b" }} />
              <YAxis yAxisId="left" domain={[93, 100]} fontSize={12} tick={{ fill: "#64748b" }} label={{ value: "FPY %", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontSize: 11 } }} />
              <YAxis yAxisId="right" orientation="right" domain={[2000, 4500]} fontSize={12} tick={{ fill: "#64748b" }} label={{ value: "PPM", angle: 90, position: "insideRight", style: { fill: "#64748b", fontSize: 11 } }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <ReferenceLine yAxisId="left" y={97} stroke="#ef4444" strokeDasharray="5 5" label={{ value: "Target 97%", fill: "#ef4444", fontSize: 11 }} />
              <Line yAxisId="left" type="monotone" dataKey="fpy" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} name="First Pass Yield %" />
              <Line yAxisId="right" type="monotone" dataKey="defectPPM" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} name="Defect Rate (PPM)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Defect Pareto Analysis</h2>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={defectPareto}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="type" fontSize={11} tick={{ fill: "#64748b" }} angle={-15} textAnchor="end" height={50} />
              <YAxis yAxisId="left" fontSize={12} tick={{ fill: "#64748b" }} label={{ value: "Count %", angle: -90, position: "insideLeft", style: { fill: "#64748b", fontSize: 11 } }} />
              <YAxis yAxisId="right" orientation="right" domain={[0, 100]} fontSize={12} tick={{ fill: "#64748b" }} label={{ value: "Cumulative %", angle: 90, position: "insideRight", style: { fill: "#64748b", fontSize: 11 } }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
              <Bar yAxisId="left" dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Defect %" />
              <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke="#ef4444" strokeWidth={2} dot={{ r: 3 }} name="Cumulative %" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Active Non-Conformance Reports</h2>
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search NCRs..."
              value={ncrFilter}
              onChange={(e) => setNcrFilter(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 px-3 font-medium text-slate-500">NCR Number</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Product</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Type</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Severity</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Disposition</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Reported</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Status</th>
                <th className="text-left py-3 px-3 font-medium text-slate-500">Assigned To</th>
              </tr>
            </thead>
            <tbody>
              {filteredNcrs.map((ncr) => (
                <tr key={ncr.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                  <td className="py-3 px-3 font-mono font-medium text-blue-600">{ncr.id}</td>
                  <td className="py-3 px-3 text-slate-700">{ncr.product}</td>
                  <td className="py-3 px-3 text-slate-600">{ncr.type}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${severityConfig[ncr.severity].bg} ${severityConfig[ncr.severity].text}`}>
                      {severityConfig[ncr.severity].label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-600">{ncr.disposition}</td>
                  <td className="py-3 px-3 text-slate-500">{ncr.reported}</td>
                  <td className="py-3 px-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusConfig[ncr.status].bg} ${statusConfig[ncr.status].text}`}>
                      {statusConfig[ncr.status].label}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-slate-700">{ncr.assignedTo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">CAPA Tracking</h2>
          <div className="flex items-center gap-1 mb-5 bg-slate-50 rounded-lg p-3">
            {capaPipeline.map((stage, idx) => (
              <React.Fragment key={stage.stage}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full ${stage.color} text-white flex items-center justify-center font-bold text-sm`}>
                    {stage.count}
                  </div>
                  <span className="text-xs text-slate-500 mt-1.5 text-center">{stage.stage}</span>
                </div>
                {idx < capaPipeline.length - 1 && (
                  <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-[-16px]" />
                )}
              </React.Fragment>
            ))}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2.5 px-3 font-medium text-slate-500">CAPA #</th>
                  <th className="text-left py-2.5 px-3 font-medium text-slate-500">Type</th>
                  <th className="text-left py-2.5 px-3 font-medium text-slate-500">Source</th>
                  <th className="text-left py-2.5 px-3 font-medium text-slate-500">Risk</th>
                  <th className="text-left py-2.5 px-3 font-medium text-slate-500">Status</th>
                  <th className="text-left py-2.5 px-3 font-medium text-slate-500">Target Date</th>
                  <th className="text-left py-2.5 px-3 font-medium text-slate-500">Assigned To</th>
                </tr>
              </thead>
              <tbody>
                {capaData.map((capa) => (
                  <tr key={capa.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-medium text-blue-600">{capa.id}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${capa.type === "corrective" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                        {capa.type === "corrective" ? "Corrective" : "Preventive"}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{capa.source}</td>
                    <td className="py-2.5 px-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${riskConfig[capa.risk].bg} ${riskConfig[capa.risk].text}`}>
                        {capa.risk.charAt(0).toUpperCase() + capa.risk.slice(1)}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-slate-600 capitalize">{capa.status}</td>
                    <td className="py-2.5 px-3 text-slate-500">{capa.targetDate}</td>
                    <td className="py-2.5 px-3 text-slate-700">{capa.assignedTo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">SPC Control Chart - X-bar</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={spcData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="sample" fontSize={11} tick={{ fill: "#64748b" }} label={{ value: "Sample #", position: "insideBottom", offset: -2, style: { fill: "#64748b", fontSize: 11 } }} />
              <YAxis domain={[22.5, 28]} fontSize={11} tick={{ fill: "#64748b" }} />
              <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
              <ReferenceLine y={26.5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "UCL", fill: "#ef4444", fontSize: 10, position: "right" }} />
              <ReferenceLine y={23.5} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "LCL", fill: "#ef4444", fontSize: 10, position: "right" }} />
              <ReferenceLine y={25} stroke="#22c55e" strokeDasharray="2 2" label={{ value: "CL", fill: "#22c55e", fontSize: 10, position: "right" }} />
              <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={<SpcDot />} name="Measurement" />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              In Control
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              Out of Control
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Inspection Summary</h2>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" />
            Current Month
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {inspections.map((insp) => {
            const total = insp.passed + insp.failed;
            const passRate = total > 0 ? ((insp.passed / total) * 100).toFixed(1) : "100";
            return (
              <div key={insp.label} className="border border-slate-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-slate-700">{insp.label}</h3>
                  <div className={`w-2.5 h-2.5 rounded-full ${insp.color}`} />
                </div>
                {insp.isAudit ? (
                  <div>
                    <p className="text-2xl font-bold text-slate-900">{insp.passed}</p>
                    <p className="text-xs text-slate-500 mt-1">Completed</p>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-baseline gap-2">
                      <p className="text-2xl font-bold text-slate-900">{passRate}%</p>
                      <p className="text-xs text-slate-500">pass rate</p>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-1.5 mt-2.5">
                      <div className={`${insp.color} h-1.5 rounded-full`} style={{ width: `${passRate}%` }} />
                    </div>
                    <div className="flex justify-between mt-2 text-xs">
                      <span className="text-emerald-600 font-medium">{insp.passed} passed</span>
                      <span className="text-red-500 font-medium">{insp.failed} failed</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
