"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, parse } from "date-fns";
import type { MonthToMonthItem } from "@/models";

interface MonthToMonthChartProps {
  data: MonthToMonthItem[];
}

export function MonthToMonthChart({ data }: MonthToMonthChartProps) {
  const chart_data = data.map((item) => {
    const month_date = parse(item.month, "yyyy-MM", new Date());
    return {
      month: format(month_date, "MMM"),
      income: item.income,
      expense: item.expense,
    };
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Month to Month Expense and Income</h2>
      </div>
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500" />
          <span className="text-sm">Income</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" />
          <span className="text-sm">Expense</span>
        </div>
        <span className="text-sm text-muted-foreground">Last 12 Months</span>
      </div>
      <ResponsiveContainer width="100%" height={450}>
        <LineChart data={chart_data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `₹${value / 1000}k`;
              }
              return `₹${value}`;
            }}
          />
          <Tooltip
            formatter={(value: number | undefined) =>
              new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 0,
              }).format(value || 0)
            }
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="income"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="expense"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: "#ef4444", r: 4 }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

