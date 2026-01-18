"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingUp, Home } from "lucide-react";
import { ReactNode } from "react";

interface SummaryCardProps {
  title: string;
  value: number;
  icon: ReactNode;
  icon_bg_color: string;
  change_percentage?: number;
  change_color?: string;
  subtitle?: string;
  isLoading?: boolean;
}

function SummaryCard({
  title,
  value,
  icon,
  icon_bg_color,
  change_percentage,
  change_color,
  subtitle,
  isLoading = false,
}: SummaryCardProps) {
  return (
    <Card className="border-none drop-shadow-sm py-4">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <div className={`h-12 w-12 rounded-full ${icon_bg_color} flex items-center justify-center`}>
          {icon}
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
            <div className="text-xl sm:text-2xl font-bold">
              {new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: "INR",
                minimumFractionDigits: 2,
              }).format(value)}
            </div>
            {change_percentage !== undefined && change_color && (
              <p className={`text-xs ${change_color} mt-1 flex items-center gap-1`}>
                <TrendingUp className="h-3 w-3" />
                {Math.abs(change_percentage)}% vs last month
              </p>
            )}
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

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
      <SummaryCard
        title="Total Income"
        value={total_income}
        icon={<span className="text-2xl">💰</span>}
        icon_bg_color="bg-green-100 dark:bg-green-900/20"
        change_percentage={income_change}
        change_color="text-green-600 dark:text-green-400"
        isLoading={isLoading}
      />
      <SummaryCard
        title="Total Expenses"
        value={total_expenses}
        icon={<span className="text-2xl">➖</span>}
        icon_bg_color="bg-red-100 dark:bg-red-900/20"
        change_percentage={expense_change}
        change_color="text-red-600 dark:text-red-400"
        isLoading={isLoading}
      />
      <SummaryCard
        title="Net Balance"
        value={net_balance}
        icon={<Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />}
        icon_bg_color="bg-blue-100 dark:bg-blue-900/20"
        subtitle="For selected date range"
        isLoading={isLoading}
      />
    </div>
  );
}

