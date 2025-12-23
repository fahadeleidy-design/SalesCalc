import { useState } from 'react';
import {
  Search,
  Filter,
  X,
  SlidersHorizontal,
  Calendar,
  DollarSign,
  TrendingUp,
  User,
  Building2,
} from 'lucide-react';

interface FilterOptions {
  search: string;
  status: string;
  source: string;
  scoreMin: number;
  scoreMax: number;
  valueMin: string;
  valueMax: string;
  assignedTo: string;
  dateFrom: string;
  dateTo: string;
}

interface AdvancedSearchFilterProps {
  onFilterChange: (filters: FilterOptions) => void;
  type: 'leads' | 'opportunities';
  assignedUsers?: Array<{ id: string; full_name: string }>;
}

export default function AdvancedSearchFilter({
  onFilterChange,
  type,
  assignedUsers = [],
}: AdvancedSearchFilterProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    search: '',
    status: 'all',
    source: 'all',
    scoreMin: 0,
    scoreMax: 100,
    valueMin: '',
    valueMax: '',
    assignedTo: 'all',
    dateFrom: '',
    dateTo: '',
  });

  const updateFilter = (key: keyof FilterOptions, value: any) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const clearFilters = () => {
    const defaultFilters: FilterOptions = {
      search: '',
      status: 'all',
      source: 'all',
      scoreMin: 0,
      scoreMax: 100,
      valueMin: '',
      valueMax: '',
      assignedTo: 'all',
      dateFrom: '',
      dateTo: '',
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
  };

  const hasActiveFilters =
    filters.status !== 'all' ||
    filters.source !== 'all' ||
    filters.scoreMin > 0 ||
    filters.scoreMax < 100 ||
    filters.valueMin ||
    filters.valueMax ||
    filters.assignedTo !== 'all' ||
    filters.dateFrom ||
    filters.dateTo;

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
      {/* Search Bar */}
      <div className="flex gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${type}...`}
            value={filters.search}
            onChange={(e) => updateFilter('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          />
        </div>
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className={`px-4 py-2.5 rounded-lg font-medium text-sm transition-all flex items-center gap-2 ${
            showAdvanced
              ? 'bg-blue-50 text-blue-700 border-2 border-blue-200'
              : 'bg-slate-100 text-slate-700 border-2 border-transparent hover:bg-slate-200'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="bg-blue-600 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
              {Object.values(filters).filter((v) => v && v !== 'all' && v !== 0 && v !== 100).length}
            </span>
          )}
        </button>
      </div>

      {/* Advanced Filters */}
      {showAdvanced && (
        <div className="pt-4 border-t border-slate-200 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => updateFilter('status', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Statuses</option>
                {type === 'leads' ? (
                  <>
                    <option value="new">New</option>
                    <option value="contacted">Contacted</option>
                    <option value="qualified">Qualified</option>
                    <option value="unqualified">Unqualified</option>
                    <option value="converted">Converted</option>
                    <option value="lost">Lost</option>
                  </>
                ) : (
                  <>
                    <option value="creating_proposition">Creating Proposition</option>
                    <option value="proposition_accepted">Proposition Accepted</option>
                    <option value="going_our_way">Going Our Way</option>
                    <option value="closing">Closing</option>
                    <option value="closed_won">Closed Won</option>
                    <option value="closed_lost">Closed Lost</option>
                  </>
                )}
              </select>
            </div>

            {/* Source Filter (for leads) */}
            {type === 'leads' && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Source
                </label>
                <select
                  value={filters.source}
                  onChange={(e) => updateFilter('source', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                >
                  <option value="all">All Sources</option>
                  <option value="website">Website</option>
                  <option value="referral">Referral</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="social">Social Media</option>
                  <option value="event">Event</option>
                  <option value="advertising">Advertising</option>
                  <option value="other">Other</option>
                </select>
              </div>
            )}

            {/* Assigned To Filter */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                <User className="h-4 w-4" />
                Assigned To
              </label>
              <select
                value={filters.assignedTo}
                onChange={(e) => updateFilter('assignedTo', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              >
                <option value="all">All Users</option>
                {assignedUsers.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.full_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Lead Score Range (for leads) */}
          {type === 'leads' && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Lead Score: {filters.scoreMin} - {filters.scoreMax}
              </label>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scoreMin}
                  onChange={(e) => updateFilter('scoreMin', parseInt(e.target.value))}
                  className="flex-1"
                />
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={filters.scoreMax}
                  onChange={(e) => updateFilter('scoreMax', parseInt(e.target.value))}
                  className="flex-1"
                />
              </div>
            </div>
          )}

          {/* Value Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Value Range (SAR)
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="number"
                placeholder="Min value"
                value={filters.valueMin}
                onChange={(e) => updateFilter('valueMin', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="number"
                placeholder="Max value"
                value={filters.valueMax}
                onChange={(e) => updateFilter('valueMax', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Expected Close Date
            </label>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => updateFilter('dateFrom', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
              <input
                type="date"
                value={filters.dateTo}
                onChange={(e) => updateFilter('dateTo', e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <div className="flex justify-end pt-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Clear All Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
