import { useState } from 'react';
import {
    Calculator,
    TrendingUp,
    DollarSign,
    Clock,
    Download,
    RotateCcw,
    BarChart3,
} from 'lucide-react';
import { formatCurrency } from '../lib/currencyUtils';

interface ROIInputs {
    projectType: 'office' | 'hospitality';
    investmentAmount: number;
    implementationCost: number;
    annualMaintenanceNew: number;
    annualMaintenanceOld: number;

    // Office specific
    employeeCount: number;
    averageSalary: number;
    productivityGainPct: number;
    spaceSavedSqm: number;
    costPerSqm: number;

    // Hospitality specific
    roomCount: number;
    adrIncrease: number;
    occupancyIncreasePct: number;
    replacementCycleYearsOld: number;
    replacementCycleYearsNew: number;
}

const DEFAULT_INPUTS: ROIInputs = {
    projectType: 'office',
    investmentAmount: 100000,
    implementationCost: 15000,
    annualMaintenanceNew: 2000,
    annualMaintenanceOld: 8000,

    employeeCount: 50,
    averageSalary: 60000,
    productivityGainPct: 5,
    spaceSavedSqm: 20,
    costPerSqm: 300,

    roomCount: 100,
    adrIncrease: 15,
    occupancyIncreasePct: 3,
    replacementCycleYearsOld: 5,
    replacementCycleYearsNew: 10,
};

export default function ROICalculatorPage() {
    const [inputs, setInputs] = useState<ROIInputs>(DEFAULT_INPUTS);
    const [showResults, setShowResults] = useState(false);

    // Calculations
    const calculateROI = () => {
        let annualBenefits = 0;
        let breakdown = [];

        // 1. Maintenance Savings (Common)
        const maintenanceSavings = inputs.annualMaintenanceOld - inputs.annualMaintenanceNew;
        annualBenefits += maintenanceSavings;
        breakdown.push({ name: 'Maintenance Savings', value: maintenanceSavings });

        if (inputs.projectType === 'office') {
            // Space Optimization
            const spaceSavings = inputs.spaceSavedSqm * inputs.costPerSqm;
            annualBenefits += spaceSavings;
            breakdown.push({ name: 'Space Optimization', value: spaceSavings });

            // Productivity Gain (Ergonomics/Environment)
            const productivityValue = (inputs.employeeCount * inputs.averageSalary * inputs.productivityGainPct) / 100;
            annualBenefits += productivityValue;
            breakdown.push({ name: 'Productivity & Retention', value: productivityValue });
        } else {
            // Hospitality Metrics
            // ADR and Occupancy Gain
            const revenueGain = (inputs.roomCount * inputs.adrIncrease * 365) +
                (inputs.roomCount * (inputs.occupancyIncreasePct / 100) * inputs.adrIncrease * 365);
            annualBenefits += revenueGain;
            breakdown.push({ name: 'Revenue Upside (ADR/Occ)', value: revenueGain });

            // Durability / Replacement Cycle Benefit
            // Saving = (Annualized cost of old) - (Annualized cost of new)
            const replacementSaving = (inputs.investmentAmount / inputs.replacementCycleYearsOld) -
                (inputs.investmentAmount / inputs.replacementCycleYearsNew);
            annualBenefits += replacementSaving;
            breakdown.push({ name: 'Durability Lifecycle Saving', value: replacementSaving });
        }

        const totalInvestment = inputs.investmentAmount + inputs.implementationCost;
        const netAnnualBenefit = annualBenefits;

        // ROI percentage (Annual)
        const roiPercentage = (netAnnualBenefit / totalInvestment) * 100;

        // Payback period (months)
        const paybackMonths = totalInvestment / (netAnnualBenefit / 12);

        // 5-Year Total Value
        const fiveYearValue = (annualBenefits * 5) - totalInvestment;

        return {
            annualBenefits,
            breakdown,
            totalInvestment,
            netAnnualBenefit,
            roiPercentage,
            paybackMonths,
            fiveYearValue,
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

    const updateInput = (key: keyof ROIInputs, value: any) => {
        setInputs({ ...inputs, [key]: value });
    };

    return (
        <div className="space-y-6 print:p-8">
            {/* Header */}
            <div className="flex items-center justify-between print:hidden">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Project ROI Calculator</h1>
                    <p className="text-slate-600 mt-1">Furniture solutions ROI analysis for Office & Hospitality</p>
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
                        Project Parameters
                    </h2>

                    <div className="space-y-6">
                        {/* Project Type */}
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-2 block">Project Category</label>
                            <div className="grid grid-cols-2 gap-2">
                                <button
                                    onClick={() => updateInput('projectType', 'office')}
                                    className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${inputs.projectType === 'office'
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    Office Furniture
                                </button>
                                <button
                                    onClick={() => updateInput('projectType', 'hospitality')}
                                    className={`py-2 px-4 rounded-lg border text-sm font-medium transition-colors ${inputs.projectType === 'hospitality'
                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                        : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                                        }`}
                                >
                                    Hospitality / Hotel
                                </button>
                            </div>
                        </div>

                        {/* Investment */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-600">Product Investment</label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        value={inputs.investmentAmount}
                                        onChange={(e) => updateInput('investmentAmount', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-600">Inst. & Services</label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        value={inputs.implementationCost}
                                        onChange={(e) => updateInput('implementationCost', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Maintenance */}
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-sm text-slate-600">Old Annual Maint.</label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        value={inputs.annualMaintenanceOld}
                                        onChange={(e) => updateInput('annualMaintenanceOld', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-sm text-slate-600">New Annual Maint.</label>
                                <div className="relative mt-1">
                                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                    <input
                                        type="number"
                                        value={inputs.annualMaintenanceNew}
                                        onChange={(e) => updateInput('annualMaintenanceNew', parseFloat(e.target.value) || 0)}
                                        className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-slate-100 pt-6">
                            <h3 className="text-sm font-semibold text-slate-900 mb-4">
                                {inputs.projectType === 'office' ? 'Office Efficiency Metrics' : 'Hospitality Performance Metrics'}
                            </h3>

                            {inputs.projectType === 'office' ? (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-600">Employee Count</label>
                                        <input
                                            type="number"
                                            value={inputs.employeeCount}
                                            onChange={(e) => updateInput('employeeCount', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">Avg Annual Salary</label>
                                        <div className="relative mt-1">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                value={inputs.averageSalary}
                                                onChange={(e) => updateInput('averageSalary', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">Space Saved (sqm)</label>
                                        <input
                                            type="number"
                                            value={inputs.spaceSavedSqm}
                                            onChange={(e) => updateInput('spaceSavedSqm', parseFloat(e.target.value) || 0)}
                                            className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">Cost per Sqm/Year</label>
                                        <div className="relative mt-1">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                value={inputs.costPerSqm}
                                                onChange={(e) => updateInput('costPerSqm', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm text-slate-600 block">Productivity/Retention Gain (%)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="20"
                                            step="0.5"
                                            value={inputs.productivityGainPct}
                                            onChange={(e) => updateInput('productivityGainPct', parseFloat(e.target.value) || 0)}
                                            className="w-full mt-2 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>0%</span>
                                            <span>{inputs.productivityGainPct}% Gain</span>
                                            <span>20%</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm text-slate-600">Room Count</label>
                                        <input
                                            type="number"
                                            value={inputs.roomCount}
                                            onChange={(e) => updateInput('roomCount', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">Projected ADR Incr.</label>
                                        <div className="relative mt-1">
                                            <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                                            <input
                                                type="number"
                                                value={inputs.adrIncrease}
                                                onChange={(e) => updateInput('adrIncrease', parseFloat(e.target.value) || 0)}
                                                className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">Current Replace Cycle (yrs)</label>
                                        <input
                                            type="number"
                                            value={inputs.replacementCycleYearsOld}
                                            onChange={(e) => updateInput('replacementCycleYearsOld', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm text-slate-600">New Replace Cycle (yrs)</label>
                                        <input
                                            type="number"
                                            value={inputs.replacementCycleYearsNew}
                                            onChange={(e) => updateInput('replacementCycleYearsNew', parseInt(e.target.value) || 0)}
                                            className="w-full mt-1 px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                                        />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-sm text-slate-600 block">Occupancy Increase (%)</label>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10"
                                            step="0.5"
                                            value={inputs.occupancyIncreasePct}
                                            onChange={(e) => updateInput('occupancyIncreasePct', parseFloat(e.target.value) || 0)}
                                            className="w-full mt-2 h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                                            <span>0%</span>
                                            <span>{inputs.occupancyIncreasePct}% Gain</span>
                                            <span>10%</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleCalculate}
                            className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors mt-4 print:hidden"
                        >
                            Analyze Project ROI
                        </button>
                    </div>
                </div>

                {/* Results Section */}
                <div className="space-y-6">
                    {showResults ? (
                        <>
                            {/* Key Metrics */}
                            <div className="grid grid-cols-2 gap-4">
                                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg shadow-emerald-200/50 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-emerald-100 font-medium">Annual ROI</span>
                                        <TrendingUp className="w-5 h-5 text-emerald-200" />
                                    </div>
                                    <p className="text-3xl font-bold">{results.roiPercentage.toFixed(1)}%</p>
                                    <p className="text-sm text-emerald-100 mt-1">Return on Investment</p>
                                </div>
                                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg shadow-blue-200/50 transition-all">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-blue-100 font-medium">Payback</span>
                                        <Clock className="w-5 h-5 text-blue-200" />
                                    </div>
                                    <p className="text-3xl font-bold">{results.paybackMonths.toFixed(1)}</p>
                                    <p className="text-sm text-blue-100 mt-1">Months to Break Even</p>
                                </div>
                            </div>

                            {/* Detailed Results */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 print:shadow-none print:border-0 overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-5">
                                    <BarChart3 className="w-24 h-24 text-indigo-600" />
                                </div>

                                <h2 className="text-lg font-semibold text-slate-900 mb-6 flex items-center gap-2">
                                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                                    Financial Analysis
                                </h2>

                                <div className="space-y-6 relative z-10">
                                    {/* Benefits Breakdown */}
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900 mb-4 tracking-wide uppercase">Annual Value Breakdown</h3>
                                        <div className="space-y-4">
                                            {results.breakdown.map((item, idx) => (
                                                <div key={idx} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                                        <span className="text-sm text-slate-600">{item.name}</span>
                                                    </div>
                                                    <span className="font-semibold text-slate-900">{formatCurrency(item.value)}</span>
                                                </div>
                                            ))}
                                            <div className="flex justify-between items-center pt-4 border-t border-dashed border-slate-200">
                                                <span className="text-sm font-bold text-slate-900">Total Annual Benefits</span>
                                                <span className="text-lg font-bold text-emerald-600">{formatCurrency(results.annualBenefits)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Investment Summary */}
                                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                                        <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                                            <DollarSign className="w-4 h-4 text-indigo-600" />
                                            Investment Summary
                                        </h3>
                                        <div className="space-y-2">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">One-time Investment</span>
                                                <span className="font-medium text-slate-900">{formatCurrency(results.totalInvestment)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Net 5-Year Gain</span>
                                                <span className="font-bold text-indigo-600">{formatCurrency(results.fiveYearValue)}</span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Visual Bar Chart */}
                                    <div>
                                        <h3 className="text-sm font-medium text-slate-700 mb-4">Initial Investment Payback</h3>
                                        <div className="relative h-4 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="absolute top-0 left-0 h-full bg-indigo-500 rounded-full transition-all duration-1000"
                                                style={{ width: `${Math.min(100, (results.annualBenefits / results.totalInvestment) * 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-[10px] text-slate-400 mt-2 text-center uppercase tracking-tighter">
                                            Year 1 Benefit covers {((results.annualBenefits / results.totalInvestment) * 100).toFixed(0)}% of investment
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-200 p-12 flex flex-col items-center justify-center text-center">
                            <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center mb-4">
                                <Calculator className="w-8 h-8 text-slate-300" />
                            </div>
                            <h3 className="text-slate-900 font-semibold mb-2">ROI Analysis Ready</h3>
                            <p className="text-slate-500 text-sm max-w-xs">
                                Enter your project parameters and click analyze to see detailed financial projections.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
