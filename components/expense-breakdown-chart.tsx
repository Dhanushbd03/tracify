"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import type { ExpenseBreakdownItem } from "@/models";

interface ExpenseBreakdownChartProps {
  data: ExpenseBreakdownItem[];
}

const format_currency = (value: number) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(value);
};

export function ExpenseBreakdownChart({ data }: ExpenseBreakdownChartProps) {
  const chart_data = data
    .map((item) => {
      const debit = item.debit || 0;
      const credit = item.credit || 0;
      const real_expense = item.value || 0;
      
      return {
        name: item.category,
        debit: debit,
        credit: credit,
        real_expense: real_expense,
      };
    })
    .sort((a, b) => Math.abs(b.real_expense) - Math.abs(a.real_expense));

  const all_categories = data.map((item) => ({
    category: item.category,
    debit: item.debit || 0,
    credit: item.credit || 0,
    real_expense: item.value || 0,
  }));

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (!data) return null;
      return (
        <div className="bg-background border border-border rounded-lg p-3 shadow-lg">
          <p className="font-semibold mb-2">{data.name || data.category}</p>
          <p className="text-sm text-red-600">
            Debit: {format_currency(data.debit || 0)}
          </p>
          <p className="text-sm text-green-600">
            Credit: {format_currency(data.credit || 0)}
          </p>
          <p className="text-sm font-medium mt-1">
            Real Expense: {format_currency(data.real_expense || 0)}
          </p>
        </div>
      );
    }
    return null;
  };

  if (chart_data.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Expense Breakdown</h2>
        </div>
        <div className="flex items-center justify-center h-[400px] text-muted-foreground">
          No expense data available
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Expense Breakdown</h2>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <BarChart data={chart_data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis 
            dataKey="name" 
            tick={{ fontSize: 12 , color: "#ffffff" }}
            angle={-45}
            textAnchor="end"
            height={100}
          />
          <YAxis
            tick={{ fontSize: 12, color: "#ffffff" }}
            tickFormatter={(value) => {
              if (value >= 1000) {
                return `₹${value / 1000}k`;
              }
              return `₹${value}`;
            }}
          />
          <Tooltip content={CustomTooltip} />
          <Legend />
          <Bar 
            dataKey="debit" 
            fill="#ef4444" 
            name="Debit"
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="credit" 
            fill="#22c55e" 
            name="Credit"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
      <div className="space-y-2 pt-4">
        <div className="flex flex-wrap gap-2">
          {all_categories.sort((a, b) => b.real_expense - a.real_expense).map((item) => {
            const debit = item.debit;
            const credit = item.credit;
            const real_expense = item.real_expense;
            return (
              <Badge 
                variant="secondary" 
                key={item.category} 
                className="text-sm py-1.5 px-3"
              >
                <span className="font-medium mr-1">{item.category}:</span>
                <span className="text-red-600 mr-1">
                  {format_currency(debit)}
                </span>
                <span className="mx-1">-</span>
                <span className="text-green-600 mr-1">
                  {format_currency(credit)}
                </span>
                <span className="mx-1">=</span>
                <span className="font-semibold">
                  {format_currency(real_expense)}
                </span>
              </Badge>
            );
          })}
        </div>
      </div>
    </div>
  );
}

