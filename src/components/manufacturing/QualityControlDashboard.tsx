import React, { useState, useMemo } from "react";
import {
  AlertTriangle,
  FileWarning,
  ClipboardList,
  Search,
  ArrowRight,
  Shield,
  CalendarClock,
  Wrench,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Inbox,
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
} from "recharts";
import { format, isPast, isFuture, addDays } from "date-fns";
import {
  useNCRs,
  useCAPAActions,
  useSPCData,
  useSPCControlCharts,
  useCalibrationRecords,
  useAuditSchedules,
  useCustomerComplaints,
} from "../../hooks/useQualityManagement";

type Tab = "overview" | "ncrs" | "capa" | "calibration" | "audits";

const severityConfig: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700" },
  major: { bg: "bg-orange-100", text: "text-orange-700" },
  minor: { bg: "bg-blue-100", text: "text-blue-700" },
};

const ncrStatusConfig: Record<string, { bg: string; text: string }> = {
  open: { bg: "bg-red-100", text: "text-red-700" },
  under_review: { bg: "bg-amber-100", text: "text-amber-700" },
  disposition_pending: { bg: "bg-purple-100", text: "text-purple-700" },
  rework: { bg: "bg-orange-100", text: "text-orange-700" },
  scrap: { bg: "bg-rose-100", text: "text-rose-700" },
  use_as_is: { bg: "bg-sky-100", text: "text-sky-700" },
  return_to_supplier: { bg: "bg-indigo-100", text: "text-indigo-700" },
  closed: { bg: "bg-green-100", text: "text-green-700" },
};

const priorityConfig: Record<string, { bg: string; text: string }> = {
  critical: { bg: "bg-red-100", text: "text-red-700" },
  high: { bg: "bg-orange-100", text: "text-orange-700" },
  medium: { bg: "bg-amber-100", text: "text-amber-700" },
  low: { bg: "bg-green-100", text: "text-green-700" },
};

const calibrationResultConfig: Record<string, { bg: string; text: string }> = {
  pass: { bg: "bg-green-100", text: "text-green-700" },
  fail: { bg: "bg-red-100", text: "text-red-700" },
  adjusted: { bg: "bg-amber-100", text: "text-amber-700" },
  out_of_tolerance: { bg: "bg-rose-100", text: "text-rose-700" },
};

const auditResultConfig: Record<string, { bg: string; text: string }> = {
  conforming: { bg: "bg-green-100", text: "text-green-700" },
  minor_nonconformance: { bg: "bg-amber-100", text: "text-amber-700" },
  major_nonconformance: { bg: "bg-red-100", text: "text-red-700" },
};

function Badge({ value, config }: { value: string; config: Record<string, { bg: string; text: string }> }) {
  const style = config[value] || { bg: "bg-gray-100", text: "text-gray-600" };
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {value.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
    </span>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-16">
      <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
      <span className="ml-2 text-sm text-slate-500">Loading...</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

const capaPipelineStages: { key: string; label: string; color: string }[] = [
  { key: "open", label: "Open", color: "bg-slate-400" },
  { key: "investigation", label: "Investigation", color: "bg-blue-500" },
  { key: "action_planned", label: "Planned", color: "bg-indigo-500" },
  { key: "in_progress", label: "In Progress", color: "bg-amber-500" },
  { key: "verification", label: "Verification", color: "bg-emerald-500" },
  { key: "closed", label: "Closed", color: "bg-green-700" },
];

export default function QualityControlDashboard() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");
  const [ncrSearch, setNcrSearch] = useState("");

  const { data: ncrs = [], isLoading: ncrsLoading } = useNCRs();
  const { data: capas = [], isLoading: capasLoading } = useCAPAActions();
  const { data: spcData = [], isLoading: spcLoading } = useSPCData();
  const { data: spcCharts = [] } = useSPCControlCharts();
  const { data: calibrations = [], isLoading: calibrationsLoading } = useCalibrationRecords();
  const { data: audits = [], isLoading: auditsLoading } = useAuditSchedules();
  const { data: complaints = [] } = useCustomerComplaints();

  const kpis = useMemo(() => {
    const openNcrs = ncrs.filter((n) => n.status !== "closed").length;
    const criticalNcrs = ncrs.filter((n) => n.severity === "critical" && n.status !== "closed").length;
    const activeCAPAs = capas.filter((c) => c.status !== "closed" && c.status !== "cancelled").length;
    const overdueCAPAs = capas.filter(
      (c) => c.due_date && isPast(new Date(c.due_date)) && c.status !== "closed" && c.status !== "cancelled"
    ).length;
    const calibrationsDue = calibrations.filter(
      (c) => c.status === "due_soon" || c.status === "expired"
    ).length;
    const upcomingAudits = audits.filter(
      (a) => a.status === "planned" || a.status === "scheduled"
    ).length;
    return { openNcrs, criticalNcrs, activeCAPAs, overdueCAPAs, calibrationsDue, upcomingAudits };
  }, [ncrs, capas, calibrations, audits]);

  const ncrChartData = useMemo(() => {
    const grouped: Record<string, { month: string; critical: number; major: number; minor: number }> = {};
    ncrs.forEach((n) => {
      const month = format(new Date(n.detected_at), "MMM yyyy");
      if (!grouped[month]) grouped[month] = { month, critical: 0, major: 0, minor: 0 };
      grouped[month][n.severity]++;
    });
    return Object.values(grouped).slice(-12);
  }, [ncrs]);

  const ncrTypeData = useMemo(() => {
    const counts: Record<string, number> = {};
    ncrs.forEach((n) => {
      counts[n.ncr_type] = (counts[n.ncr_type] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([type, count]) => ({ type: type.replace(/_/g, " "), count }))
      .sort((a, b) => b.count - a.count);
  }, [ncrs]);

  const spcChartData = useMemo(() => {
    const chart = spcCharts[0];
    if (!chart) return { data: [], ucl: 0, lcl: 0, cl: 0 };
    const filtered = spcData
      .filter((m) => m.checkpoint_id === chart.checkpoint_id)
      .slice(-30)
      .map((m, i) => ({
        sample: i + 1,
        value: m.measured_value,
        ucl: chart.upper_control_limit,
        lcl: chart.lower_control_limit,
        cl: chart.center_line,
      }));
    return { data: filtered, ucl: chart.upper_control_limit, lcl: chart.lower_control_limit, cl: chart.center_line };
  }, [spcData, spcCharts]);

  const capaPipelineCounts = useMemo(() => {
    return capaPipelineStages.map((stage) => ({
      ...stage,
      count: capas.filter((c) => c.status === stage.key).length,
    }));
  }, [capas]);

  const filteredNcrs = useMemo(() => {
    if (!ncrSearch) return ncrs;
    const q = ncrSearch.toLowerCase();
    return ncrs.filter(
      (n) =>
        n.ncr_number.toLowerCase().includes(q) ||
        n.title.toLowerCase().includes(q) ||
        (n.product?.name || "").toLowerCase().includes(q)
    );
  }, [ncrs, ncrSearch]);

  const tabs: { key: Tab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "ncrs", label: "NCRs" },
    { key: "capa", label: "CAPA" },
    { key: "calibration", label: "Calibration" },
    { key: "audits", label: "Audits" },
  ];

  const isLoading = ncrsLoading || capasLoading || calibrationsLoading || auditsLoading;

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quality Control Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manufacturing Quality Management System</p>
        </div>
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-500">{format(new Date(), "MMM d, yyyy hh:mm a")}</span>
        </div>
      </div>

      <div className="flex gap-1 border-b border-slate-200">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {[
          { label: "Open NCRs", value: kpis.openNcrs, icon: FileWarning, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
          { label: "Critical NCRs", value: kpis.criticalNcrs, icon: AlertTriangle, color: "text-rose-600", bg: "bg-rose-50", border: "border-rose-200" },
          { label: "Active CAPAs", value: kpis.activeCAPAs, icon: ClipboardList, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
          { label: "Overdue CAPAs", value: kpis.overdueCAPAs, icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
          { label: "Calibrations Due", value: kpis.calibrationsDue, icon: Wrench, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
          { label: "Upcoming Audits", value: kpis.upcomingAudits, icon: CalendarClock, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
        ].map((m) => (
          <div key={m.label} className={`bg-white rounded-xl border ${m.border} p-4 space-y-3`}>
            <div className={`p-2 rounded-lg ${m.bg} w-fit`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? "-" : m.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      {activeTab === "overview" && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">NCR Trend by Severity</h2>
              {ncrsLoading ? (
                <LoadingState />
              ) : ncrChartData.length === 0 ? (
                <EmptyState message="No NCR data available" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={ncrChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" fontSize={12} tick={{ fill: "#64748b" }} />
                    <YAxis fontSize={12} tick={{ fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="critical" fill="#ef4444" radius={[2, 2, 0, 0]} name="Critical" />
                    <Bar dataKey="major" fill="#f97316" radius={[2, 2, 0, 0]} name="Major" />
                    <Bar dataKey="minor" fill="#3b82f6" radius={[2, 2, 0, 0]} name="Minor" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">NCR by Type</h2>
              {ncrsLoading ? (
                <LoadingState />
              ) : ncrTypeData.length === 0 ? (
                <EmptyState message="No NCR type data available" />
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <ComposedChart data={ncrTypeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="type" fontSize={11} tick={{ fill: "#64748b" }} />
                    <YAxis fontSize={12} tick={{ fill: "#64748b" }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                    <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} name="Count" />
                  </ComposedChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-900 mb-4">SPC Control Chart</h2>
            {spcLoading ? (
              <LoadingState />
            ) : spcChartData.data.length === 0 ? (
              <EmptyState message="No SPC data available" />
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={spcChartData.data}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="sample" fontSize={11} tick={{ fill: "#64748b" }} />
                  <YAxis fontSize={11} tick={{ fill: "#64748b" }} />
                  <Tooltip contentStyle={{ borderRadius: "8px", border: "1px solid #e2e8f0" }} />
                  <ReferenceLine y={spcChartData.ucl} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "UCL", fill: "#ef4444", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={spcChartData.lcl} stroke="#ef4444" strokeDasharray="4 4" label={{ value: "LCL", fill: "#ef4444", fontSize: 10, position: "right" }} />
                  <ReferenceLine y={spcChartData.cl} stroke="#22c55e" strokeDasharray="2 2" label={{ value: "CL", fill: "#22c55e", fontSize: 10, position: "right" }} />
                  <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={1.5} dot={{ r: 3 }} name="Measurement" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}

      {(activeTab === "overview" || activeTab === "ncrs") && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-900">Non-Conformance Reports</h2>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search NCRs..."
                value={ncrSearch}
                onChange={(e) => setNcrSearch(e.target.value)}
                className="pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          {ncrsLoading ? (
            <LoadingState />
          ) : filteredNcrs.length === 0 ? (
            <EmptyState message="No NCRs found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-medium text-slate-500">NCR #</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Title</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Product</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Type</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Severity</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Detected</th>
                    <th className="text-right py-3 px-3 font-medium text-slate-500">Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredNcrs.map((ncr) => (
                    <tr key={ncr.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-blue-600">{ncr.ncr_number}</td>
                      <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate">{ncr.title}</td>
                      <td className="py-3 px-3 text-slate-600">{ncr.product?.name || "-"}</td>
                      <td className="py-3 px-3">
                        <Badge value={ncr.ncr_type} config={severityConfig} />
                      </td>
                      <td className="py-3 px-3">
                        <Badge value={ncr.severity} config={severityConfig} />
                      </td>
                      <td className="py-3 px-3">
                        <Badge value={ncr.status} config={ncrStatusConfig} />
                      </td>
                      <td className="py-3 px-3 text-slate-500">{format(new Date(ncr.detected_at), "MMM d, yyyy")}</td>
                      <td className="py-3 px-3 text-right text-slate-600">
                        {ncr.cost_of_nonconformance != null ? `$${ncr.cost_of_nonconformance.toLocaleString()}` : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(activeTab === "overview" || activeTab === "capa") && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">CAPA Tracking</h2>
          {capasLoading ? (
            <LoadingState />
          ) : (
            <>
              <div className="flex items-center gap-1 mb-5 bg-slate-50 rounded-lg p-3">
                {capaPipelineCounts.map((stage, idx) => (
                  <React.Fragment key={stage.key}>
                    <div className="flex flex-col items-center flex-1">
                      <div className={`w-10 h-10 rounded-full ${stage.color} text-white flex items-center justify-center font-bold text-sm`}>
                        {stage.count}
                      </div>
                      <span className="text-xs text-slate-500 mt-1.5 text-center">{stage.label}</span>
                    </div>
                    {idx < capaPipelineCounts.length - 1 && (
                      <ArrowRight className="w-4 h-4 text-slate-300 flex-shrink-0 mt-[-16px]" />
                    )}
                  </React.Fragment>
                ))}
              </div>
              {capas.length === 0 ? (
                <EmptyState message="No CAPA actions found" />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        <th className="text-left py-2.5 px-3 font-medium text-slate-500">CAPA #</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-500">Title</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-500">Type</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-500">Priority</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-500">Status</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-500">Due Date</th>
                        <th className="text-left py-2.5 px-3 font-medium text-slate-500">Assigned To</th>
                      </tr>
                    </thead>
                    <tbody>
                      {capas.map((capa) => {
                        const isOverdue =
                          capa.due_date &&
                          isPast(new Date(capa.due_date)) &&
                          capa.status !== "closed" &&
                          capa.status !== "cancelled";
                        return (
                          <tr key={capa.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-medium text-blue-600">{capa.capa_number}</td>
                            <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate">{capa.title}</td>
                            <td className="py-2.5 px-3">
                              <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${capa.type === "corrective" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>
                                {capa.type === "corrective" ? "Corrective" : "Preventive"}
                              </span>
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge value={capa.priority} config={priorityConfig} />
                            </td>
                            <td className="py-2.5 px-3">
                              <Badge value={capa.status} config={ncrStatusConfig} />
                            </td>
                            <td className={`py-2.5 px-3 ${isOverdue ? "text-red-600 font-medium" : "text-slate-500"}`}>
                              {capa.due_date ? format(new Date(capa.due_date), "MMM d, yyyy") : "-"}
                              {isOverdue && <span className="ml-1 text-xs">(overdue)</span>}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700">{capa.assigned_user?.full_name || "-"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {(activeTab === "overview" || activeTab === "calibration") && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Calibration Records</h2>
          {calibrationsLoading ? (
            <LoadingState />
          ) : calibrations.length === 0 ? (
            <EmptyState message="No calibration records found" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Equipment</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">ID Tag</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Last Calibrated</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Next Due</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Result</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {calibrations.map((cal) => {
                    const isDue = cal.status === "due_soon" || cal.status === "expired";
                    return (
                      <tr key={cal.id} className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${isDue ? "bg-amber-50/50" : ""}`}>
                        <td className="py-3 px-3 text-slate-700 font-medium">{cal.equipment_name}</td>
                        <td className="py-3 px-3 font-mono text-slate-600">{cal.equipment_id_tag}</td>
                        <td className="py-3 px-3 text-slate-500">{format(new Date(cal.calibration_date), "MMM d, yyyy")}</td>
                        <td className={`py-3 px-3 ${isDue ? "text-red-600 font-medium" : "text-slate-500"}`}>
                          {format(new Date(cal.next_calibration_date), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-3">
                          <Badge value={cal.result} config={calibrationResultConfig} />
                        </td>
                        <td className="py-3 px-3">
                          <Badge value={cal.status} config={{ valid: { bg: "bg-green-100", text: "text-green-700" }, expired: { bg: "bg-red-100", text: "text-red-700" }, due_soon: { bg: "bg-amber-100", text: "text-amber-700" }, out_of_service: { bg: "bg-gray-100", text: "text-gray-700" } }} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {(activeTab === "overview" || activeTab === "audits") && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Audit Schedule</h2>
          {auditsLoading ? (
            <LoadingState />
          ) : audits.length === 0 ? (
            <EmptyState message="No audits scheduled" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Audit #</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Title</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Type</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Scheduled</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Status</th>
                    <th className="text-left py-3 px-3 font-medium text-slate-500">Result</th>
                    <th className="text-right py-3 px-3 font-medium text-slate-500">Findings</th>
                  </tr>
                </thead>
                <tbody>
                  {audits.map((audit) => (
                    <tr key={audit.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 font-mono font-medium text-blue-600">{audit.audit_number}</td>
                      <td className="py-3 px-3 text-slate-700 max-w-[200px] truncate">{audit.title}</td>
                      <td className="py-3 px-3">
                        <Badge value={audit.audit_type} config={severityConfig} />
                      </td>
                      <td className="py-3 px-3 text-slate-500">{format(new Date(audit.scheduled_date), "MMM d, yyyy")}</td>
                      <td className="py-3 px-3">
                        <Badge value={audit.status} config={{ planned: { bg: "bg-slate-100", text: "text-slate-600" }, scheduled: { bg: "bg-blue-100", text: "text-blue-700" }, in_progress: { bg: "bg-amber-100", text: "text-amber-700" }, completed: { bg: "bg-green-100", text: "text-green-700" }, cancelled: { bg: "bg-red-100", text: "text-red-700" }, postponed: { bg: "bg-gray-100", text: "text-gray-600" } }} />
                      </td>
                      <td className="py-3 px-3">
                        {audit.result ? <Badge value={audit.result} config={auditResultConfig} /> : <span className="text-slate-400">-</span>}
                      </td>
                      <td className="py-3 px-3 text-right">
                        {audit.findings_count > 0 ? (
                          <span className="text-slate-700">
                            {audit.findings_count}
                            {audit.major_findings > 0 && (
                              <span className="ml-1 text-xs text-red-600">({audit.major_findings} major)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
