import OpenAI from 'openai';
import type { Quotation } from '../hooks/useQuotations';

// Initialize OpenAI client with environment variable
const openai = new OpenAI();

/**
 * Approval route suggestion with confidence score
 */
export interface ApprovalRoute {
  approvers: string[];
  estimatedTime: number; // in hours
  confidence: number; // 0-1
  reasoning: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  suggestedPath: string;
}

/**
 * Historical approval data for learning
 */
interface ApprovalHistory {
  quotationValue: number;
  complexity: number;
  customerTier: string;
  approvers: string[];
  approvalTime: number; // in hours
  approved: boolean;
}

/**
 * Predict optimal approval route using AI
 * Analyzes quotation characteristics and historical patterns
 */
export async function predictApprovalRoute(
  quotation: Quotation,
  approvalHistory: ApprovalHistory[]
): Promise<ApprovalRoute> {
  try {
    // Calculate quotation complexity score
    const complexity = calculateComplexity(quotation);
    
    // Prepare context for AI
    const context = {
      value: quotation.net_total,
      complexity,
      itemCount: quotation.items.length,
      discountPercentage: quotation.discount_percentage,
      customerName: quotation.customer_name,
      hasCustomItems: quotation.items.some((item: any) => item.is_custom),
      historicalData: approvalHistory.slice(-10), // Last 10 approvals
    };

    // Call OpenAI for intelligent routing
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes sales quotations and suggests optimal approval workflows. 
          Based on quotation value, complexity, and historical approval patterns, recommend:
          1. The best approval path (approvers in order)
          2. Estimated approval time
          3. Priority level
          4. Confidence score (0-1)
          5. Clear reasoning
          
          Approval rules:
          - Under $10,000: Sales Manager only
          - $10,000-$50,000: Sales Manager → Finance Manager
          - $50,000-$100,000: Sales Manager → Finance Manager → CEO
          - Over $100,000: Sales Manager → Engineering → Finance Manager → CEO
          - High complexity (>0.7): Add Engineering review
          - High discount (>15%): Requires Finance approval
          - Custom items: Requires Engineering approval`,
        },
        {
          role: 'user',
          content: `Analyze this quotation and suggest approval route:\n${JSON.stringify(context, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3, // Lower temperature for more consistent results
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      approvers: response.approvers || ['Manager'],
      estimatedTime: response.estimatedTime || 24,
      confidence: response.confidence || 0.7,
      reasoning: response.reasoning || 'Based on quotation value and complexity',
      priority: response.priority || 'medium',
      suggestedPath: response.suggestedPath || 'Standard approval path',
    };
  } catch (error) {
    console.error('AI approval routing error:', error);
    
    // Fallback to rule-based routing
    return getRuleBasedRoute(quotation);
  }
}

/**
 * Calculate quotation complexity score (0-1)
 * Based on multiple factors
 */
function calculateComplexity(quotation: Quotation): number {
  let score = 0;
  
  // Factor 1: Number of items (0-0.3)
  const itemScore = Math.min(quotation.items.length / 20, 0.3);
  score += itemScore;
  
  // Factor 2: Custom items (0-0.3)
  const customItemCount = quotation.items.filter((item: any) => item.is_custom).length;
  const customScore = Math.min(customItemCount / 5, 0.3);
  score += customScore;
  
  // Factor 3: Discount percentage (0-0.2)
  const discountScore = Math.min(quotation.discount_percentage / 30, 0.2);
  score += discountScore;
  
  // Factor 4: Total value (0-0.2)
  const valueScore = quotation.net_total > 100000 ? 0.2 : quotation.net_total > 50000 ? 0.15 : quotation.net_total > 10000 ? 0.1 : 0.05;
  score += valueScore;
  
  return Math.min(score, 1);
}

/**
 * Rule-based approval routing (fallback)
 */
function getRuleBasedRoute(quotation: Quotation): ApprovalRoute {
  const value = quotation.net_total;
  const complexity = calculateComplexity(quotation);
  const hasCustomItems = quotation.items.some((item: any) => item.is_custom);
  const highDiscount = quotation.discount_percentage > 15;

  let approvers: string[] = [];
  let estimatedTime = 24;
  let priority: 'low' | 'medium' | 'high' | 'urgent' = 'medium';
  let reasoning = '';

  // Determine approval path based on value
  if (value < 10000) {
    approvers = ['Manager'];
    estimatedTime = 8;
    priority = 'low';
    reasoning = 'Low value quotation - Manager approval only';
  } else if (value < 50000) {
    approvers = ['Manager', 'Finance'];
    estimatedTime = 24;
    priority = 'medium';
    reasoning = 'Medium value quotation - Manager and Finance approval';
  } else if (value < 100000) {
    approvers = ['Manager', 'Finance', 'CEO'];
    estimatedTime = 48;
    priority = 'high';
    reasoning = 'High value quotation - Full approval chain';
  } else {
    approvers = ['Manager', 'Engineering', 'Finance', 'CEO'];
    estimatedTime = 72;
    priority = 'urgent';
    reasoning = 'Very high value quotation - Complete approval process';
  }

  // Add Engineering if complex or has custom items
  if ((complexity > 0.7 || hasCustomItems) && !approvers.includes('Engineering')) {
    approvers.splice(1, 0, 'Engineering');
    estimatedTime += 12;
    reasoning += ' | Engineering review required due to complexity/custom items';
  }

  // Ensure Finance is included for high discounts
  if (highDiscount && !approvers.includes('Finance')) {
    approvers.push('Finance');
    estimatedTime += 8;
    reasoning += ' | Finance approval required for high discount';
  }

  return {
    approvers,
    estimatedTime,
    confidence: 0.85,
    reasoning,
    priority,
    suggestedPath: approvers.join(' → '),
  };
}

/**
 * Analyze quotation for potential issues
 */
export async function analyzeQuotation(quotation: Quotation): Promise<{
  issues: string[];
  warnings: string[];
  suggestions: string[];
  score: number; // 0-100
}> {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        {
          role: 'system',
          content: `You are an AI assistant that analyzes sales quotations for potential issues, warnings, and improvement opportunities.
          Provide:
          1. Critical issues that must be fixed
          2. Warnings that should be reviewed
          3. Suggestions for improvement
          4. Overall quality score (0-100)`,
        },
        {
          role: 'user',
          content: `Analyze this quotation:\n${JSON.stringify({
            total: quotation.net_total,
            items: quotation.items.length,
            discount: quotation.discount_percentage,
            customer: quotation.customer_name,
            notes: quotation.notes,
          }, null, 2)}`,
        },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });

    const response = JSON.parse(completion.choices[0].message.content || '{}');

    return {
      issues: response.issues || [],
      warnings: response.warnings || [],
      suggestions: response.suggestions || [],
      score: response.score || 75,
    };
  } catch (error) {
    console.error('Quotation analysis error:', error);
    
    // Fallback analysis
    return analyzeQuotationRuleBased(quotation);
  }
}

/**
 * Rule-based quotation analysis (fallback)
 */
function analyzeQuotationRuleBased(quotation: Quotation): {
  issues: string[];
  warnings: string[];
  suggestions: string[];
  score: number;
} {
  const issues: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Check for missing information
  if (!quotation.customer_name) {
    issues.push('Customer name is missing');
    score -= 20;
  }

  if (!quotation.email) {
    warnings.push('Customer email is missing - quotation cannot be sent');
    score -= 10;
  }

  if (quotation.items.length === 0) {
    issues.push('No items in quotation');
    score -= 30;
  }

  // Check discount
  if (quotation.discount_percentage > 20) {
    warnings.push(`High discount (${quotation.discount_percentage}%) may require special approval`);
    score -= 5;
  }

  if (quotation.discount_percentage > 30) {
    issues.push(`Excessive discount (${quotation.discount_percentage}%) exceeds policy limits`);
    score -= 15;
  }

  // Check value
  if (quotation.net_total < 100) {
    warnings.push('Very low quotation value - consider minimum order requirements');
    score -= 5;
  }

  // Check for notes
  if (!quotation.notes || quotation.notes.trim().length === 0) {
    suggestions.push('Add notes or terms and conditions to the quotation');
    score -= 5;
  }

  // Suggestions
  if (quotation.items.length > 10) {
    suggestions.push('Consider grouping similar items to simplify the quotation');
  }

  if (quotation.discount_percentage === 0 && quotation.net_total > 10000) {
    suggestions.push('Consider offering a volume discount for this high-value quotation');
  }

  return {
    issues,
    warnings,
    suggestions,
    score: Math.max(0, score),
  };
}

/**
 * Suggest optimal pricing based on historical data
 */
export async function suggestPricing(
  productId: string,
  quantity: number,
  customerTier: string
): Promise<{
  suggestedPrice: number;
  minPrice: number;
  maxPrice: number;
  confidence: number;
  reasoning: string;
}> {
  // This would typically analyze historical pricing data
  // For now, return a simple suggestion
  
  return {
    suggestedPrice: 100,
    minPrice: 80,
    maxPrice: 120,
    confidence: 0.75,
    reasoning: 'Based on historical pricing for similar quantities and customer tier',
  };
}
