import { useState } from 'react';
import {
    Calculator,
    TrendingUp,
    DollarSign,
    Clock,
    Download,
    RotateCcw,
    PieChart,
    BarChart3,
} from 'lucide-react';
import { formatCurrency } from '../lib/currencyUtils';

interface ROIInputs {
    currentAnnualCost: number;
    proposedSolutionCost: number;
    implementationCost: number;
    annualMaintenance: number;
    expectedProductivityGain: number;
    employeeCount: number;
    averageSalary: number;
    timeSavedPerWeekHours: number;
    additionalRevenuePotential: number;
    timeToValue: number;
}

const DEFAULT_INPUTS: ROIInputs = {
    currentAnnualCost: 50000,
    proposedSolutionCost: 75000,
    implementationCost: 15000,
    annualMaintenance: 7500,
    expectedProductivityGain: 15,
    employeeCount: 25,
    averageSalary: 60000,
    timeSavedPerWeekHours: 5,
    additionalRevenuePotential: 100000,
    timeToValue: 3,
};

export default function ROICalculatorPage() {
    const [inputs, setInputs] = useState<ROIInputs>(DEFAULT_INPUTS);
    const [showResults, setShowResults] = useState(false);

    // Calculations
    const calculateROI = () => {
        // Time savings value
        const hourlyRate = inputs.averageSalary / (52 * 40);
        const annualTimeSavings = inputs.timeSavedPerWeekHours * 52 * hourlyRate * inputs.employeeCount;

        // Productivity value
        const productivityValue = (inputs.averageSalary * inputs.employeeCount * inputs.expectedProductivityGain) / 100;

        // Total annual benefits
        const totalAnnualBenefits = annualTimeSavings + productivityValue + inputs.additionalRevenuePotential;

        // Total costs
        const firstYearCost = inputs.proposedSolutionCost + inputs.implementationCost;
        const ongoingAnnualCost = inputs.proposedSolutionCost + inputs.annualMaintenance;

        // Current state cost comparison
        const currentCostSavings = inputs.currentAnnualCost - ongoingAnnualCost;

        // Net benefit
        const firstYearNetBenefit = totalAnnualBenefits - firstYearCost;
        const annualNetBenefit = totalAnnualBenefits - ongoingAnnualCost + inputs.currentAnnualCost;

        // ROI percentage
        const roiPercentage = ((totalAnnualBenefits - ongoingAnnualCost) / firstYearCost) * 100;

        // Payback period (months)
        const monthlyBenefit = annualNetBenefit / 12;
        const paybackMonths = firstYearCost / monthlyBenefit;

        // 3-year TCO comparison
        const currentTCO3Year = inputs.currentAnnualCost * 3;
        const proposedTCO3Year = firstYearCost + (ongoingAnnualCost * 2);
        const tcoSavings3Year = currentTCO3Year - proposedTCO3Year + (totalAnnualBenefits * 3);

        return {
            annualTimeSavings,
            productivityValue,
            totalAnnualBenefits,
            firstYearCost,
            ongoingAnnualCost,
            currentCostSavings,
            firstYearNetBenefit,
            annualNetBenefit,
            roiPercentage,
            paybackMonths,
            currentTCO3Year,
            proposedTCO3Year,
            tcoSavings3Year,
        };
    };

    const results = calculateROI();

    const handleCalculate = () => {
        setShowResults(true);
    };

    const handleReset = () => {
        setInputs(DEFAULT_INPUTS);
        setShowResults(false);
    };

    const handleExportPDF = () => {
        // Simple print for now - can be enhanced with jsPDF later
        window.print();
    };

    const updateInput = (key: keyof ROIInputs, value: number) => {
        setInputs({ ...inputs, [key]: value });
        if (showResults) {
            // Recalculate live
        }
    };

    return (
        <div className="space-y-6 print:p-8">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">ROI Calculator</h1>
                    <p className="text-slate-600 mt-1">Calculate return on investment for your solution proposals</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={handleReset}
                        className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                    >
                        <RotateCcw className="w-4 h-4" />
                        Reset
                    </button>
                    {showResults && (
                        <button
                            onClick={handleExportPDF}
                            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                        >
                            <Download className="w-4 h-4" />
                            Export PDF
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Inputs Section */}
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-0">
                    <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                        <Calculator className="w-5 h-5 text-indigo-600" />
                        Input Parameters
                    </h2>

                    <div className="space-y-6">
                        {/* Current State */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-700 mb-3">Current State</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="text-sm text-slate-600">Current Annual Cost</label>
                                    <div className="relative mt-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={inputs.currentAnnualCost}
                                            onChange={(e) => updateInput('currentAnnualCost', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Proposed Solution */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-700 mb-3">Proposed Solution</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-slate-600">Solution Cost</label>
                                    <div className="relative mt-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={inputs.proposedSolutionCost}
                                            onChange={(e) => updateInput('proposedSolutionCost', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">Implementation</label>
                                    <div className="relative mt-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={inputs.implementationCost}
                                            onChange={(e) => updateInput('implementationCost', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm text-slate-600">Annual Maintenance</label>
                                    <div className="relative mt-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={inputs.annualMaintenance}
                                            onChange={(e) => updateInput('annualMaintenance', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Benefits */}
                        <div>
                            <h3 className="text-sm font-medium text-slate-700 mb-3">Expected Benefits</h3>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="text-sm text-slate-600">Employees Affected</label>
                                    <input
                                        type="number"
                                        value={inputs.employeeCount}
                                        onChange={(e) => updateInput('employeeCount', parseInt(e.target.value) || 0)}
                                        className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">Avg Salary</label>
                                    <div className="relative mt-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={inputs.averageSalary}
                                            onChange={(e) => updateInput('averageSalary', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">Productivity Gain (%)</label>
                                    <input
                                        type="number"
                                        value={inputs.expectedProductivityGain}
                                        onChange={(e) => updateInput('expectedProductivityGain', parseFloat(e.target.value) || 0)}
                                        className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        max="100"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-slate-600">Time Saved (hrs/week)</label>
                                    <input
                                        type="number"
                                        value={inputs.timeSavedPerWeekHours}
                                        onChange={(e) => updateInput('timeSavedPerWeekHours', parseFloat(e.target.value) || 0)}
                                        className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                    />
                                </div>
                                <div className="col-span-2">
                                    <label className="text-sm text-slate-600">Additional Revenue Potential</label>
                                    <div className="relative mt-1">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                        <input
                                            type="number"
                                            value={inputs.additionalRevenuePotential}
                                            onChange={(e) => updateInput('additionalRevenuePotential', parseFloat(e.target.value) || 0)}
                                            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleCalculate}
                            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors print:hidden"
                        >
                            Calculate ROI
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                    {showResults ? (
                        <>
                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-emerald-100">ROI</span>
                                        <TrendingUp className="w-5 h-5 text-emerald-200" />
                                    </div>
                                    <p className="text-3xl font-bold">{results.roiPercentage.toFixed(0)}%</p>
                                    <p className="text-sm text-emerald-100 mt-1">Return on Investment</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-blue-100">Payback</span>
                                        <Clock className="w-5 h-5 text-blue-200" />
                                    </div>
                                    <p className="text-3xl font-bold">{results.paybackMonths.toFixed(1)}</p>
                                    <p className="text-sm text-blue-100 mt-1">Months to Break Even</p>
                                </div>
                            </div>

                            {/* Detailed Results */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-0">
                                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                    Financial Analysis
                                </h2>

                                <div className="space-y-6">
                                    {/* Benefits Breakdown */}
                                    <div>
                                        <h3 className="text-sm font-medium text-emerald-700 mb-3">Annual Benefits</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Time Savings Value</span>
                                                <span className="font-medium text-emerald-600">+{formatCurrency(results.annualTimeSavings)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Productivity Gains</span>
                                                <span className="font-medium text-emerald-600">+{formatCurrency(results.productivityValue)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Revenue Potential</span>
                                                <span className="font-medium text-emerald-600">+{formatCurrency(inputs.additionalRevenuePotential)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2 border-t border-slate-100 font-semibold">
                                                <span>Total Annual Benefits</span>
                                                <span className="text-emerald-600">{formatCurrency(results.totalAnnualBenefits)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Costs Breakdown */}
                                    <div>
                                        <h3 className="text-sm font-medium text-red-700 mb-3">Investment Required</h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">First Year Cost</span>
                                                <span className="font-medium text-red-600">-{formatCurrency(results.firstYearCost)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Ongoing Annual</span>
                                                <span className="font-medium text-red-600">-{formatCurrency(results.ongoingAnnualCost)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* 3-Year TCO */}
                                    <div className="bg-slate-50 rounded-lg p-4">
                                        <h3 className="text-sm font-medium text-slate-900 mb-3 flex items-center gap-2">
                                            <PieChart className="w-4 h-4" />
                                            3-Year TCO Comparison
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Current Solution (3yr)</span>
                                                <span className="font-medium">{formatCurrency(results.currentTCO3Year)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Proposed Solution (3yr)</span>
                                                <span className="font-medium">{formatCurrency(results.proposedTCO3Year)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm pt-2 border-t border-slate-200 font-semibold">
                                                <span>3-Year Net Value</span>
                                                <span className={results.tcoSavings3Year >= 0 ? 'text-emerald-600' : 'text-red-600'}>
                                                    {formatCurrency(results.tcoSavings3Year)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Bar Chart */}
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700 mb-3">Benefits vs. Costs</h3>
                                        <div className="space-y-3">
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                                    <span>Annual Benefits</span>
                                                    <span>{formatCurrency(results.totalAnnualBenefits)}</span>
                                                </div>
                                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-emerald-500 rounded-full"
                                                        style={{ width: '100%' }}
                                                    />
                                                </div>
                                            </div>
                                            <div>
                                                <div className="flex justify-between text-xs text-slate-600 mb-1">
                                                    <span>Annual Costs</span>
                                                    <span>{formatCurrency(results.ongoingAnnualCost)}</span>
                                                </div>
                                                <div className="h-4 bg-slate-100 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-red-400 rounded-full"
                                                        style={{ width: `${(results.ongoingAnnualCost / results.totalAnnualBenefits) * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center">
                            <Calculator className="w-16 h-16 mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-medium text-slate-900 mb-2">Enter Your Parameters</h3>
                            <p className="text-slate-500">Fill in the input fields and click "Calculate ROI" to see the results</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
