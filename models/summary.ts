export type ExpenseBreakdownItem = {
  category: string;
  value: number;
  debit?: number;
  credit?: number;
};

export type MonthToMonthItem = {
  month: string;
  income: number;
  expense: number;
};

export type SummaryData = {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  expense_breakdown: ExpenseBreakdownItem[];
  month_to_month: MonthToMonthItem[];
};

export type SummaryResponse = {
  data: SummaryData;
};

