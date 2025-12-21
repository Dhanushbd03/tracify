"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, TrendingDown, Home } from "lucide-react";

interface SummaryCardsProps {
  total_income: number;
  total_expenses: number;
  net_balance: number;
  income_change?: number;
  expense_change?: number;
  isLoading?: boolean;
}

export function SummaryCards({
  total_income,
  total_expenses,
  net_balance,
  income_change,
  expense_change,
  isLoading = false,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card className="border-none drop-shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Income</CardTitle>
          <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
            <span className="text-2xl">💰</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 2,
                }).format(total_income)}
              </div>
              {income_change !== undefined && (
                <p className="text-xs text-green-600 dark:text-green-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {Math.abs(income_change)}% vs last month
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-none drop-shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
          <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
            <span className="text-2xl">➖</span>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 2,
                }).format(total_expenses)}
              </div>
              {expense_change !== undefined && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" />
                  {Math.abs(expense_change)}% vs last month
                </p>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Card className="border-none drop-shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Net Balance</CardTitle>
          <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
            <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <>
              <Skeleton className="h-8 w-32 mb-2" />
              <Skeleton className="h-4 w-24" />
            </>
          ) : (
            <>
              <div className="text-2xl font-bold">
                {new Intl.NumberFormat("en-IN", {
                  style: "currency",
                  currency: "INR",
                  minimumFractionDigits: 2,
                }).format(net_balance)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">For selected date range</p>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

