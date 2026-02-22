import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { Debt, Expense } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { expenses, debts, apiKey } = (await request.json()) as {
      expenses: Expense[];
      debts: Debt[];
      apiKey: string;
    };

    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is required. Please add your Anthropic API key in Settings.' },
        { status: 400 }
      );
    }

    const client = new Anthropic({ apiKey });

    const totalDebt = debts.reduce((sum, d) => sum + d.balance, 0);
    const totalMinPayments = debts.reduce((sum, d) => sum + d.minimumPayment, 0);
    const avgRate = debts.length > 0
      ? debts.reduce((sum, d) => sum + d.interestRate, 0) / debts.length
      : 0;

    const expenseSummary = expenses
      .map((e) => `- ${e.description}: $${e.amount.toFixed(2)} (${e.category}, ${e.isRecurring ? 'recurring' : 'one-time'})`)
      .join('\n');

    const debtSummary = debts
      .map((d) => `- ${d.name}: $${d.balance.toFixed(2)} at ${d.interestRate}% APR, min payment $${d.minimumPayment}`)
      .join('\n');

    const prompt = `You are a financial advisor AI. Analyze this person's expenses and debts to help them pay off debt faster.

EXPENSES (recent):
${expenseSummary || 'No expenses recorded.'}

DEBTS:
${debtSummary || 'No debts recorded.'}

SUMMARY:
- Total debt: $${totalDebt.toFixed(2)}
- Total monthly minimum payments: $${totalMinPayments.toFixed(2)}
- Average interest rate: ${avgRate.toFixed(2)}%

Please provide your analysis as JSON with this exact structure:
{
  "unnecessaryExpenses": [
    {
      "description": "expense name",
      "amount": 0.00,
      "reason": "why this is unnecessary",
      "suggestedAction": "eliminate" | "reduce" | "keep",
      "potentialSaving": 0.00
    }
  ],
  "monthlySavingsPotential": 0.00,
  "debtPayoffSuggestion": "A paragraph explaining the recommended debt payoff approach",
  "priorityActions": ["action 1", "action 2", "action 3"]
}

Rules:
- Only mark expenses as unnecessary if they genuinely are (subscriptions, excessive dining out, impulse shopping)
- Essential expenses like rent, utilities, groceries, insurance should be marked as "keep"
- For "reduce" suggestions, specify a realistic saving amount
- Be specific and actionable in your recommendations
- Consider the person's total debt load when making suggestions
- Respond with ONLY the JSON, no other text`;

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    });

    const responseText = message.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Extract JSON from the response (handle potential markdown wrapping)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 });
    }

    const analysis = JSON.parse(jsonMatch[0]);

    // Map expense IDs where possible
    if (analysis.unnecessaryExpenses) {
      analysis.unnecessaryExpenses = analysis.unnecessaryExpenses.map(
        (rec: { description: string; amount: number; reason: string; suggestedAction: string; potentialSaving: number }) => {
          const matchingExpense = expenses.find(
            (e) =>
              e.description.toLowerCase().includes(rec.description.toLowerCase()) ||
              rec.description.toLowerCase().includes(e.description.toLowerCase())
          );
          return {
            ...rec,
            expenseId: matchingExpense?.id || '',
          };
        }
      );
    }

    return NextResponse.json(analysis);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
