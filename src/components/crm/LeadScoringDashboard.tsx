import React, { useState } from 'react';
import { useLeadScoring } from '../../hooks/useLeadScoring';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, TrendingUp, Target, Award, Edit2, Trash2, Eye, EyeOff } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { LeadScoringRule, ConditionType, OperatorType } from '../../lib/database.types';

const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];

interface RuleFormData {
  name: string;
  condition_type: ConditionType;
  field_name: string;
  operator: OperatorType;
  value: string;
  points: number;
  priority: number;
  is_active: boolean;
}

export const LeadScoringDashboard: React.FC = () => {
  const {
    scoringRules,
    loadingScoringRules,
    createScoringRule,
    updateScoringRule,
    deleteScoringRule,
  } = useLeadScoring();

  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<LeadScoringRule | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    condition_type: 'behavioral',
    field_name: '',
    operator: 'equals',
    value: '',
    points: 10,
    priority: 0,
    is_active: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingRule) {
      updateScoringRule.mutate({
        id: editingRule.id,
        ...formData,
      });
    } else {
      createScoringRule.mutate(formData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      condition_type: 'behavioral',
      field_name: '',
      operator: 'equals',
      value: '',
      points: 10,
      priority: 0,
      is_active: true,
    });
    setEditingRule(null);
    setShowRuleForm(false);
  };

  const handleEdit = (rule: LeadScoringRule) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      condition_type: rule.condition_type,
      field_name: rule.field_name || '',
      operator: rule.operator,
      value: rule.value || '',
      points: rule.points,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setShowRuleForm(true);
  };

  const handleToggleActive = (rule: LeadScoringRule) => {
    updateScoringRule.mutate({
      id: rule.id,
      is_active: !rule.is_active,
    });
  };

  const activeRules = scoringRules.filter(r => r.is_active);
  const inactiveRules = scoringRules.filter(r => !r.is_active);

  const totalPossiblePoints = activeRules.reduce((sum, rule) => sum + rule.points, 0);

  const rulesByType = activeRules.reduce((acc, rule) => {
    const type = rule.condition_type;
    if (!acc[type]) {
      acc[type] = { count: 0, points: 0 };
    }
    acc[type].count++;
    acc[type].points += rule.points;
    return acc;
  }, {} as Record<string, { count: number; points: number }>);

  const typeDistributionData = Object.entries(rulesByType).map(([type, data]) => ({
    name: type.charAt(0).toUpperCase() + type.slice(1),
    value: data.count,
    points: data.points,
  }));

  const pointsDistributionData = activeRules
    .sort((a, b) => b.points - a.points)
    .slice(0, 10)
    .map(rule => ({
      name: rule.name.length > 20 ? rule.name.substring(0, 20) + '...' : rule.name,
      points: rule.points,
    }));

  if (loadingScoringRules) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading scoring rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Scoring Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Configure scoring rules and analyze lead quality distribution
          </p>
        </div>
        <Button
          onClick={() => setShowRuleForm(!showRuleForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Scoring Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Target className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Rules</p>
              <p className="text-2xl font-bold text-gray-900">{scoringRules.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Award className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Rules</p>
              <p className="text-2xl font-bold text-gray-900">{activeRules.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Max Score</p>
              <p className="text-2xl font-bold text-gray-900">{totalPossiblePoints}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <Target className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Avg Points/Rule</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeRules.length > 0
                  ? Math.round(totalPossiblePoints / activeRules.length)
                  : 0}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {showRuleForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingRule ? 'Edit Scoring Rule' : 'Create New Scoring Rule'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rule Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Condition Type *
                </label>
                <select
                  value={formData.condition_type}
                  onChange={(e) => setFormData({ ...formData, condition_type: e.target.value as ConditionType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="behavioral">Behavioral</option>
                  <option value="demographic">Demographic</option>
                  <option value="engagement">Engagement</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Field Name *
                </label>
                <input
                  type="text"
                  value={formData.field_name}
                  onChange={(e) => setFormData({ ...formData, field_name: e.target.value })}
                  placeholder="e.g., company_size, industry, email_opened"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Operator *
                </label>
                <select
                  value={formData.operator}
                  onChange={(e) => setFormData({ ...formData, operator: e.target.value as OperatorType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="equals">Equals</option>
                  <option value="contains">Contains</option>
                  <option value="greater_than">Greater Than</option>
                  <option value="less_than">Less Than</option>
                  <option value="between">Between</option>
                  <option value="in">In List</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value *
                </label>
                <input
                  type="text"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                  placeholder="e.g., enterprise, 100, active"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Points *
                </label>
                <input
                  type="number"
                  value={formData.points}
                  onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                  min="-100"
                  max="100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priority
                </label>
                <input
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="is_active" className="ml-2 text-sm text-gray-700">
                  Active Rule
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                {editingRule ? 'Update Rule' : 'Create Rule'}
              </Button>
              <Button type="button" onClick={resetForm} variant="secondary">
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Rules by Type</h3>
          {typeDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={typeDistributionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {typeDistributionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No active rules to display
            </div>
          )}
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">Top Rules by Points</h3>
          {pointsDistributionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={pointsDistributionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="points" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No rules to display
            </div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">All Scoring Rules</h3>
        <div className="space-y-2">
          {activeRules.length === 0 && inactiveRules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No scoring rules configured. Create your first rule to get started.
            </div>
          ) : (
            <>
              {activeRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                        Active
                      </span>
                      <h4 className="font-medium text-gray-900">{rule.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${
                        rule.points > 0
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {rule.points > 0 ? '+' : ''}{rule.points} pts
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-gray-500">
                      <span className="font-medium">{rule.condition_type}</span>
                      {' • '}
                      <span className="font-mono">{rule.field_name}</span>
                      {' '}
                      <span>{rule.operator}</span>
                      {' '}
                      <span className="font-mono">{rule.value}</span>
                      {' • '}
                      Priority: {rule.priority}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleToggleActive(rule)}
                    >
                      <EyeOff className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => handleEdit(rule)}
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this rule?')) {
                          deleteScoringRule.mutate(rule.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}

              {inactiveRules.length > 0 && (
                <>
                  <h4 className="text-sm font-medium text-gray-700 mt-6 mb-2">Inactive Rules</h4>
                  {inactiveRules.map((rule) => (
                    <div
                      key={rule.id}
                      className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                            Inactive
                          </span>
                          <h4 className="font-medium text-gray-700">{rule.name}</h4>
                          <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                            {rule.points > 0 ? '+' : ''}{rule.points} pts
                          </span>
                        </div>
                        <p className="mt-1 text-sm text-gray-500">
                          <span className="font-medium">{rule.condition_type}</span>
                          {' • '}
                          <span className="font-mono">{rule.field_name}</span>
                          {' '}
                          <span>{rule.operator}</span>
                          {' '}
                          <span className="font-mono">{rule.value}</span>
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleToggleActive(rule)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => handleEdit(rule)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this rule?')) {
                              deleteScoringRule.mutate(rule.id);
                            }
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};
