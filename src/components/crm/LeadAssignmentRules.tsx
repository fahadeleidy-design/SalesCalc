import React, { useState } from 'react';
import { useLeadScoring } from '../../hooks/useLeadScoring';
import { useSalesTeam } from '../../hooks/useSalesTeam';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Plus, Users, User, AlertCircle, Edit2, Trash2, Eye, EyeOff, PlayCircle, Award } from 'lucide-react';
import { VisualWorkflow } from '../ui/VisualWorkflow';
import type { LeadAssignmentRule, AssignmentRuleType } from '../../lib/database.types';

interface RuleFormData {
  name: string;
  rule_type: AssignmentRuleType;
  conditions: any;
  assign_to_team_id: string | null;
  assign_to_user_id: string | null;
  fallback_user_id: string | null;
  priority: number;
  is_active: boolean;
}

export const LeadAssignmentRules: React.FC = () => {
  const {
    assignmentRules,
    loadingAssignmentRules,
    createAssignmentRule,
    updateAssignmentRule,
    deleteAssignmentRule,
  } = useLeadScoring();

  const { data: teamMembers = [] } = useSalesTeam();

  const [showRuleForm, setShowRuleForm] = useState(false);
  const [editingRule, setEditingRule] = useState<any | null>(null);
  const [formData, setFormData] = useState<RuleFormData>({
    name: '',
    rule_type: 'round_robin',
    conditions: {},
    assign_to_team_id: null,
    assign_to_user_id: null,
    fallback_user_id: null,
    priority: 0,
    is_active: true,
  });

  const [conditionField, setConditionField] = useState('');
  const [conditionOperator, setConditionOperator] = useState('equals');
  const [conditionValue, setConditionValue] = useState('');
  const [conditions, setConditions] = useState<any[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const ruleData = {
      ...formData,
      conditions: { rules: conditions },
    };

    if (editingRule) {
      updateAssignmentRule.mutate({
        id: editingRule.id,
        ...ruleData,
      });
    } else {
      createAssignmentRule.mutate(ruleData);
    }

    resetForm();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      rule_type: 'round_robin',
      conditions: {},
      assign_to_team_id: null,
      assign_to_user_id: null,
      fallback_user_id: null,
      priority: 0,
      is_active: true,
    });
    setConditions([]);
    setEditingRule(null);
    setShowRuleForm(false);
  };

  const handleEdit = (rule: any) => {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      rule_type: rule.rule_type,
      conditions: rule.conditions,
      assign_to_team_id: rule.assign_to_team_id,
      assign_to_user_id: rule.assign_to_user_id,
      fallback_user_id: rule.fallback_user_id,
      priority: rule.priority,
      is_active: rule.is_active,
    });
    setConditions(rule.conditions?.rules || []);
    setShowRuleForm(true);
  };

  const handleToggleActive = (rule: any) => {
    updateAssignmentRule.mutate({
      id: rule.id,
      is_active: !rule.is_active,
    });
  };

  const addCondition = () => {
    if (conditionField && conditionOperator && conditionValue) {
      setConditions([
        ...conditions,
        {
          field: conditionField,
          operator: conditionOperator,
          value: conditionValue,
        },
      ]);
      setConditionField('');
      setConditionOperator('equals');
      setConditionValue('');
    }
  };

  const removeCondition = (index: number) => {
    setConditions(conditions.filter((_, i) => i !== index));
  };

  const activeRules = assignmentRules.filter((r: any) => r.is_active);
  const inactiveRules = assignmentRules.filter((r: any) => !r.is_active);

  const getRuleTypeIcon = (type: AssignmentRuleType) => {
    switch (type) {
      case 'round_robin':
        return <Users className="w-5 h-5 text-blue-600" />;
      case 'territory':
        return <AlertCircle className="w-5 h-5 text-green-600" />;
      case 'skill_based':
        return <User className="w-5 h-5 text-purple-600" />;
      case 'load_balanced':
        return <PlayCircle className="w-5 h-5 text-orange-600" />;
      case 'best_fit' as any:
        return <Award className="w-5 h-5 text-yellow-600" />;
      default:
        return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getRuleTypeColor = (type: AssignmentRuleType) => {
    switch (type) {
      case 'round_robin':
        return 'bg-blue-100 text-blue-800';
      case 'territory':
        return 'bg-green-100 text-green-800';
      case 'skill_based':
        return 'bg-purple-100 text-purple-800';
      case 'load_balanced':
        return 'bg-orange-100 text-orange-800';
      case 'best_fit' as any:
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loadingAssignmentRules) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading assignment rules...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lead Assignment Rules</h2>
          <p className="mt-1 text-sm text-gray-500">
            Automate lead distribution with intelligent assignment rules
          </p>
        </div>
        <Button
          onClick={() => setShowRuleForm(!showRuleForm)}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Add Assignment Rule
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Rules</p>
              <p className="text-2xl font-bold text-gray-900">{assignmentRules.length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-green-100 rounded-lg">
              <Eye className="w-6 h-6 text-green-600" />
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
              <User className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Round Robin</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeRules.filter((r: any) => r.rule_type === 'round_robin').length}
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-orange-100 rounded-lg">
              <AlertCircle className="w-6 h-6 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Territory Based</p>
              <p className="text-2xl font-bold text-gray-900">
                {activeRules.filter((r: any) => r.rule_type === 'territory').length}
              </p>
            </div>
          </div>
        </Card>
      </div>

      {showRuleForm && (
        <Card className="p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingRule ? 'Edit Assignment Rule' : 'Create New Assignment Rule'}
          </h3>

          {/* Logic Preview */}
          {(conditions.length > 0) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">Rule Logic Visualization</label>
              <VisualWorkflow
                chart={`graph TD\n  Start((Lead Created)) --> C{Conditions}\n  ${conditions.map((c, i) => `C --> Cond${i}["${c.field} ${c.operator} ${c.value}"]`).join('\n  ')}\n  Cond${conditions.length - 1 || 0} --> Assign["Assign to ${formData.rule_type}"]`}
              />
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
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
                  Rule Type *
                </label>
                <select
                  value={formData.rule_type}
                  onChange={(e) => setFormData({ ...formData, rule_type: e.target.value as AssignmentRuleType })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="round_robin">Round Robin</option>
                  <option value="territory">Territory Based</option>
                  <option value="skill_based">Skill Based</option>
                  <option value="load_balanced">Load Balanced</option>
                  <option value="best_fit">Predictive Best-Fit</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Team
                </label>
                <select
                  value={formData.assign_to_team_id || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    assign_to_team_id: e.target.value || null,
                    assign_to_user_id: null,
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select Team</option>
                  {(teamMembers as any).map((team: any) => (
                    <option key={team.id} value={team.id}>
                      {team.name || team.full_name}
                    </option>
                  ))}
                </select>
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assignment Conditions
              </label>
              <div className="space-y-2">
                {conditions.map((condition, index) => (
                  <div key={index} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <span className="flex-1 text-sm">
                      <span className="font-mono">{condition.field}</span>
                      {' '}
                      <span className="text-gray-500">{condition.operator}</span>
                      {' '}
                      <span className="font-mono">{condition.value}</span>
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => removeCondition(index)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={conditionField}
                    onChange={(e) => setConditionField(e.target.value)}
                    placeholder="Field (e.g., industry, region)"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <select
                    value={conditionOperator}
                    onChange={(e) => setConditionOperator(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="equals">Equals</option>
                    <option value="contains">Contains</option>
                    <option value="in">In</option>
                  </select>
                  <input
                    type="text"
                    value={conditionValue}
                    onChange={(e) => setConditionValue(e.target.value)}
                    placeholder="Value"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                  <Button type="button" onClick={addCondition}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
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

      <Card className="p-6">
        <h3 className="text-lg font-semibold mb-4">Active Assignment Rules</h3>
        <div className="space-y-3">
          {activeRules.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No active assignment rules. Create your first rule to automate lead distribution.
            </div>
          ) : (
            activeRules.map((rule: any) => (
              <div
                key={rule.id}
                className="flex items-start justify-between p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getRuleTypeIcon(rule.rule_type)}
                    <h4 className="font-medium text-gray-900">{rule.name}</h4>
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getRuleTypeColor(rule.rule_type)}`}>
                      {rule.rule_type.replace('_', ' ').toUpperCase()}
                    </span>
                    <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 rounded">
                      Active
                    </span>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    {rule.assign_to_team_id && rule.sales_teams && (
                      <p>
                        <span className="font-medium">Assign to Team:</span> {rule.sales_teams.name}
                      </p>
                    )}
                    {rule.assign_to_user_id && rule.profiles && (
                      <p>
                        <span className="font-medium">Assign to User:</span> {rule.profiles.full_name}
                      </p>
                    )}
                    {rule.fallback_user_id && rule.fallback_profiles && (
                      <p>
                        <span className="font-medium">Fallback:</span> {rule.fallback_profiles.full_name}
                      </p>
                    )}
                    <p>
                      <span className="font-medium">Priority:</span> {rule.priority}
                    </p>
                    {rule.conditions?.rules?.length > 0 && (
                      <p>
                        <span className="font-medium">Conditions:</span> {rule.conditions.rules.length} rule(s)
                      </p>
                    )}
                  </div>
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
                        deleteAssignmentRule.mutate(rule.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {inactiveRules.length > 0 && (
          <>
            <h3 className="text-lg font-semibold mt-6 mb-4">Inactive Assignment Rules</h3>
            <div className="space-y-3">
              {inactiveRules.map((rule: any) => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg opacity-60"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getRuleTypeIcon(rule.rule_type)}
                      <h4 className="font-medium text-gray-700">{rule.name}</h4>
                      <span className={`px-2 py-1 text-xs font-medium rounded ${getRuleTypeColor(rule.rule_type)}`}>
                        {rule.rule_type.replace('_', ' ').toUpperCase()}
                      </span>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded">
                        Inactive
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      {rule.assign_to_team_id && rule.sales_teams && (
                        <p>
                          <span className="font-medium">Assign to Team:</span> {rule.sales_teams.name}
                        </p>
                      )}
                      <p>
                        <span className="font-medium">Priority:</span> {rule.priority}
                      </p>
                    </div>
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
                          deleteAssignmentRule.mutate(rule.id);
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </Card>
    </div>
  );
};
