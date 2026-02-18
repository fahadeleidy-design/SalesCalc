import React, { useState, useMemo } from "react";
import {
  ShoppingCart,
  FileText,
  Send,
  Truck,
  Clock,
  DollarSign,
  Package,
  Star,
  AlertTriangle,
  ClipboardCheck,
  FileSearch,
  Loader2,
  Inbox,
  CheckCircle,
  XCircle,
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
import { format, differenceInDays, parseISO } from "date-fns";
import {
  useSupplierScorecards,
  useRFQs,
  usePurchaseRequisitions,
  useSupplierContracts,
  useGoodsReceiptNotes,
} from "../../hooks/usePurchasingLogistics";

type TabKey = "overview" | "suppliers" | "rfqs" | "requisitions" | "contracts" | "receiving";

const TABS: { key: TabKey; label: string; icon: React.ElementType }[] = [
  { key: "overview", label: "Overview", icon: Package },
  { key: "suppliers", label: "Suppliers", icon: Star },
  { key: "rfqs", label: "RFQs", icon: FileSearch },
  { key: "requisitions", label: "Requisitions", icon: FileText },
  { key: "contracts", label: "Contracts", icon: ClipboardCheck },
  { key: "receiving", label: "Receiving", icon: Truck },
];

const rfqStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  open: { bg: "bg-blue-100", text: "text-blue-700", label: "Open" },
  closed: { bg: "bg-slate-100", text: "text-slate-700", label: "Closed" },
  awarded: { bg: "bg-green-100", text: "text-green-700", label: "Awarded" },
  cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
};

const rfqTypeConfig: Record<string, { bg: string; text: string }> = {
  standard: { bg: "bg-blue-100", text: "text-blue-700" },
  urgent: { bg: "bg-red-100", text: "text-red-700" },
  blanket: { bg: "bg-teal-100", text: "text-teal-700" },
};

const prStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  pending_approval: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Approval" },
  approved: { bg: "bg-green-100", text: "text-green-700", label: "Approved" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
  converted: { bg: "bg-blue-100", text: "text-blue-700", label: "Converted" },
  cancelled: { bg: "bg-slate-100", text: "text-slate-600", label: "Cancelled" },
};

const prPriorityConfig: Record<string, { bg: string; text: string }> = {
  low: { bg: "bg-slate-100", text: "text-slate-600" },
  medium: { bg: "bg-blue-100", text: "text-blue-700" },
  high: { bg: "bg-amber-100", text: "text-amber-700" },
  critical: { bg: "bg-red-100", text: "text-red-700" },
};

const contractStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  active: { bg: "bg-green-100", text: "text-green-700", label: "Active" },
  expired: { bg: "bg-red-100", text: "text-red-700", label: "Expired" },
  terminated: { bg: "bg-slate-100", text: "text-slate-600", label: "Terminated" },
  renewed: { bg: "bg-blue-100", text: "text-blue-700", label: "Renewed" },
};

const grnStatusConfig: Record<string, { bg: string; text: string; label: string }> = {
  draft: { bg: "bg-gray-100", text: "text-gray-600", label: "Draft" },
  pending_inspection: { bg: "bg-amber-100", text: "text-amber-700", label: "Pending Inspection" },
  inspected: { bg: "bg-blue-100", text: "text-blue-700", label: "Inspected" },
  accepted: { bg: "bg-green-100", text: "text-green-700", label: "Accepted" },
  partial: { bg: "bg-yellow-100", text: "text-yellow-700", label: "Partial" },
  rejected: { bg: "bg-red-100", text: "text-red-700", label: "Rejected" },
};

const PIE_COLORS = ["#3b82f6", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444"];

function scoreColor(score: number) {
  if (score >= 85) return "text-emerald-700 bg-emerald-50";
  if (score >= 70) return "text-amber-700 bg-amber-50";
  return "text-red-700 bg-red-50";
}

function formatCurrency(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(0)}K`;
  return value.toFixed(0);
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
      <span className="ml-2 text-sm text-slate-500">Loading...</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Inbox className="w-10 h-10 mb-2" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

export default function SupplyChainDashboard() {
  const [activeTab, setActiveTab] = useState<TabKey>("overview");

  const { data: scorecards = [], isLoading: loadingScorecards } = useSupplierScorecards();
  const { data: rfqs = [], isLoading: loadingRFQs } = useRFQs();
  const { data: requisitions = [], isLoading: loadingRequisitions } = usePurchaseRequisitions();
  const { data: contracts = [], isLoading: loadingContracts } = useSupplierContracts();
  const { data: grns = [], isLoading: loadingGRNs } = useGoodsReceiptNotes();

  const kpis = useMemo(() => {
    const totalRFQs = rfqs.length;
    const openRFQs = rfqs.filter((r) => r.status === "open").length;
    const activeContracts = contracts.filter((c) => c.status === "active").length;
    const pendingRequisitions = requisitions.filter(
      (r) => r.status === "pending_approval"
    ).length;
    const totalSpend = contracts.reduce((sum, c) => sum + (c.consumed_value ?? 0), 0);
    const avgRating =
      scorecards.length > 0
        ? scorecards.reduce((sum, s) => sum + s.overall_score, 0) / scorecards.length
        : 0;
    return { totalRFQs, openRFQs, activeContracts, pendingRequisitions, totalSpend, avgRating };
  }, [rfqs, contracts, requisitions, scorecards]);

  const contractAlerts = useMemo(() => {
    const now = new Date();
    return contracts
      .filter((c) => c.status === "active" || c.status === "expired")
      .map((c) => ({
        ...c,
        daysLeft: differenceInDays(parseISO(c.end_date), now),
      }))
      .filter((c) => c.daysLeft <= 90)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [contracts]);

  const rfqStatusChart = useMemo(() => {
    const counts: Record<string, number> = {};
    rfqs.forEach((r) => {
      counts[r.status] = (counts[r.status] || 0) + 1;
    });
    return Object.entries(counts).map(([status, value], i) => ({
      name: rfqStatusConfig[status]?.label || status,
      value,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [rfqs]);

  const supplierBarData = useMemo(() => {
    return scorecards.slice(0, 8).map((s) => ({
      name: s.suppliers?.supplier_name || s.supplier_id.slice(0, 8),
      quality: s.quality_score,
      delivery: s.delivery_score,
      price: s.price_score,
    }));
  }, [scorecards]);

  const isLoading = loadingScorecards || loadingRFQs || loadingRequisitions || loadingContracts || loadingGRNs;

  const metricCards = [
    { label: "Total RFQs", value: kpis.totalRFQs.toString(), icon: Send, color: "text-purple-600", bg: "bg-purple-50", border: "border-purple-200" },
    { label: "Open RFQs", value: kpis.openRFQs.toString(), icon: FileSearch, color: "text-blue-600", bg: "bg-blue-50", border: "border-blue-200" },
    { label: "Active Contracts", value: kpis.activeContracts.toString(), icon: ClipboardCheck, color: "text-emerald-600", bg: "bg-emerald-50", border: "border-emerald-200" },
    { label: "Pending Requisitions", value: kpis.pendingRequisitions.toString(), icon: Clock, color: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200" },
    { label: "Total Spend", value: `${formatCurrency(kpis.totalSpend)} SAR`, icon: DollarSign, color: "text-red-600", bg: "bg-red-50", border: "border-red-200" },
    { label: "Avg Supplier Rating", value: kpis.avgRating > 0 ? kpis.avgRating.toFixed(1) : "--", icon: Star, color: "text-teal-600", bg: "bg-teal-50", border: "border-teal-200" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Supply Chain & Purchasing</h1>
          <p className="text-sm text-slate-500 mt-1">Procurement Management Dashboard</p>
        </div>
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-slate-400" />
          <span className="text-sm text-slate-500">{format(new Date(), "MMM d, yyyy h:mm a")}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {metricCards.map((m) => (
          <div key={m.label} className={`bg-white rounded-xl border ${m.border} p-4 space-y-3`}>
            <div className={`p-2 rounded-lg ${m.bg} w-fit`}>
              <m.icon className={`w-5 h-5 ${m.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{isLoading ? "--" : m.value}</p>
              <p className="text-xs text-slate-500 mt-0.5">{m.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Supplier Performance Comparison</h2>
              {loadingScorecards ? <LoadingSpinner /> : supplierBarData.length === 0 ? <EmptyState message="No scorecard data available" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={supplierBarData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#64748b" }} interval={0} angle={-20} textAnchor="end" height={60} />
                    <YAxis tick={{ fontSize: 12, fill: "#64748b" }} domain={[0, 100]} />
                    <Tooltip />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="quality" fill="#3b82f6" name="Quality" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="delivery" fill="#10b981" name="Delivery" radius={[2, 2, 0, 0]} />
                    <Bar dataKey="price" fill="#f59e0b" name="Price" radius={[2, 2, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-base font-semibold text-slate-900 mb-4">RFQ Status Distribution</h2>
              {loadingRFQs ? <LoadingSpinner /> : rfqStatusChart.length === 0 ? <EmptyState message="No RFQs found" /> : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie data={rfqStatusChart} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} innerRadius={50} paddingAngle={2}>
                      {rfqStatusChart.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => [value, "Count"]} />
                    <Legend iconSize={10} wrapperStyle={{ fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {contractAlerts.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <h2 className="text-base font-semibold text-slate-900">Contract Alerts</h2>
              </div>
              <div className="space-y-3">
                {contractAlerts.map((c) => {
                  const urgent = c.daysLeft < 30;
                  const warning = c.daysLeft < 90;
                  const borderClass = urgent ? "border-red-300 bg-red-50" : warning ? "border-amber-300 bg-amber-50" : "border-slate-200 bg-slate-50";
                  const badgeClass = urgent ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700";
                  return (
                    <div key={c.id} className={`rounded-lg border ${borderClass} p-4 flex items-center justify-between`}>
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-900">{c.contract_name}</p>
                        <p className="text-xs text-slate-500">{c.suppliers?.supplier_name || "Unknown Supplier"}</p>
                      </div>
                      <div className="text-right space-y-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${badgeClass}`}>
                          {c.daysLeft <= 0 ? "Expired" : `${c.daysLeft} days left`}
                        </span>
                        <p className="text-xs text-slate-500">Remaining: {formatCurrency(c.remaining_value)} SAR</p>
                        <p className="text-xs text-slate-400">Expires: {format(parseISO(c.end_date), "MMM d, yyyy")}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "suppliers" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Supplier Performance</h2>
          {loadingScorecards ? <LoadingSpinner /> : scorecards.length === 0 ? <EmptyState message="No supplier scorecards found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Supplier</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Quality</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Delivery</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Price</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Responsiveness</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Overall</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Orders</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">On-Time %</th>
                  </tr>
                </thead>
                <tbody>
                  {scorecards.map((s) => {
                    const onTimePct = s.total_orders > 0 ? ((s.on_time_deliveries / s.total_orders) * 100) : 0;
                    return (
                      <tr key={s.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3 font-medium text-slate-900">{s.suppliers?.supplier_name || "Unknown"}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor(s.quality_score)}`}>{s.quality_score}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor(s.delivery_score)}`}>{s.delivery_score}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor(s.price_score)}`}>{s.price_score}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-xs font-semibold ${scoreColor(s.responsiveness_score)}`}>{s.responsiveness_score}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className={`px-2.5 py-1 rounded text-xs font-bold ${scoreColor(s.overall_score)}`}>{s.overall_score}</span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-700">{s.total_orders}</td>
                        <td className="py-3 px-3 text-center">
                          <span className={`text-xs font-semibold ${onTimePct >= 90 ? "text-emerald-600" : onTimePct >= 80 ? "text-amber-600" : "text-red-600"}`}>
                            {onTimePct.toFixed(1)}%
                          </span>
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

      {activeTab === "rfqs" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">RFQ Management</h2>
          {loadingRFQs ? <LoadingSpinner /> : rfqs.length === 0 ? <EmptyState message="No RFQs found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">RFQ #</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Title</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Type</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Issue Date</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Closing Date</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Budget</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rfqs.map((rfq) => {
                    const st = rfqStatusConfig[rfq.status] || { bg: "bg-gray-100", text: "text-gray-600", label: rfq.status };
                    const tp = rfqTypeConfig[rfq.rfq_type] || { bg: "bg-gray-100", text: "text-gray-600" };
                    return (
                      <tr key={rfq.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-xs font-medium text-blue-600">{rfq.rfq_number}</td>
                        <td className="py-3 px-3 font-medium text-slate-900">{rfq.rfq_title}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${tp.bg} ${tp.text}`}>{rfq.rfq_type}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{rfq.issued_date ? format(parseISO(rfq.issued_date), "MMM d, yyyy") : "--"}</td>
                        <td className="py-3 px-3 text-slate-700">{rfq.response_deadline ? format(parseISO(rfq.response_deadline), "MMM d, yyyy") : "--"}</td>
                        <td className="py-3 px-3 text-right text-slate-700">
                          {"--"}
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
          )}
        </div>
      )}

      {activeTab === "requisitions" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Purchase Requisitions</h2>
          {loadingRequisitions ? <LoadingSpinner /> : requisitions.length === 0 ? <EmptyState message="No purchase requisitions found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">PR #</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Title</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Requester</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Priority</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Required Date</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Estimated Total</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {requisitions.map((pr) => {
                    const st = prStatusConfig[pr.status] || { bg: "bg-gray-100", text: "text-gray-600", label: pr.status };
                    const pri = prPriorityConfig[pr.priority] || { bg: "bg-gray-100", text: "text-gray-600" };
                    return (
                      <tr key={pr.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-xs font-medium text-blue-600">{pr.pr_number}</td>
                        <td className="py-3 px-3 font-medium text-slate-900">{pr.title}</td>
                        <td className="py-3 px-3 text-slate-700">{pr.requester?.full_name || "--"}</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${pri.bg} ${pri.text}`}>{pr.priority}</span>
                        </td>
                        <td className="py-3 px-3 text-slate-700">{format(parseISO(pr.required_date), "MMM d, yyyy")}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(pr.estimated_total)} SAR</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
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

      {activeTab === "contracts" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Supplier Contracts</h2>
          {loadingContracts ? <LoadingSpinner /> : contracts.length === 0 ? <EmptyState message="No contracts found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Contract #</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Name</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Supplier</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Period</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Total Value</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Actual Spend</th>
                    <th className="text-right py-3 px-3 text-slate-500 font-medium">Remaining</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => {
                    const st = contractStatusConfig[c.status] || { bg: "bg-gray-100", text: "text-gray-600", label: c.status };
                    return (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-xs font-medium text-blue-600">{c.contract_number}</td>
                        <td className="py-3 px-3 font-medium text-slate-900">{c.contract_name}</td>
                        <td className="py-3 px-3 text-slate-700">{"--"}</td>
                        <td className="py-3 px-3 text-slate-700 text-xs">
                          {format(parseISO(c.start_date), "MMM d, yyyy")} - {format(parseISO(c.end_date), "MMM d, yyyy")}
                        </td>
                        <td className="py-3 px-3 text-right text-slate-700">{c.total_value ? `${formatCurrency(c.total_value)} SAR` : "--"}</td>
                        <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(c.consumed_value ?? 0)} SAR</td>
                        <td className="py-3 px-3 text-right text-slate-700">{formatCurrency(c.remaining_value)} SAR</td>
                        <td className="py-3 px-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${st.bg} ${st.text}`}>{st.label}</span>
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

      {activeTab === "receiving" && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-900 mb-4">Goods Receipt Notes</h2>
          {loadingGRNs ? <LoadingSpinner /> : grns.length === 0 ? <EmptyState message="No goods receipt notes found" /> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">GRN #</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Supplier</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Received Date</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Total Items</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Accepted</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Rejected</th>
                    <th className="text-center py-3 px-3 text-slate-500 font-medium">Acceptance Rate</th>
                    <th className="text-left py-3 px-3 text-slate-500 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grns.map((grn) => {
                    const st = grnStatusConfig[grn.status] || { bg: "bg-gray-100", text: "text-gray-600", label: grn.status };
                    const totalQty = grn.total_quantity ?? 0;
                    const acceptRate = totalQty > 0 ? 100 : 0;
                    return (
                      <tr key={grn.id} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-3 px-3 font-mono text-xs font-medium text-blue-600">{grn.grn_number}</td>
                        <td className="py-3 px-3 font-medium text-slate-900">{grn.warehouse_location || "--"}</td>
                        <td className="py-3 px-3 text-slate-700">{grn.receipt_date ? format(parseISO(grn.receipt_date), "MMM d, yyyy") : "--"}</td>
                        <td className="py-3 px-3 text-center text-slate-700">{grn.total_items ?? 0}</td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-emerald-600 font-medium">{grn.total_quantity ?? 0}</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <span className="text-slate-500">--</span>
                        </td>
                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {acceptRate >= 90 ? <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                            <span className={`text-xs font-semibold ${acceptRate >= 90 ? "text-emerald-600" : acceptRate >= 70 ? "text-amber-600" : "text-red-600"}`}>
                              {acceptRate.toFixed(1)}%
                            </span>
                          </div>
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
          )}
        </div>
      )}
    </div>
  );
}
