"use client";

import { SignedIn, SignedOut } from "@clerk/nextjs";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardHeader } from "@/components/dashboard-header";
import { SummaryCards } from "@/components/summary-cards";
import { ExpenseBreakdownChart } from "@/components/expense-breakdown-chart";
import { MonthToMonthChart } from "@/components/month-to-month-chart";
import useSWR from "swr";
import { useState } from "react";
import { ArrowRight, TrendingUp, Wallet, BarChart3 } from "lucide-react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import type { Account, AccountsResponse, SummaryResponse } from "@/models";

type FetcherError = Error & {
  info?: string;
  status?: number;
};

const fetcher = async <T,>(url: string): Promise<T> => {
  const res = await fetch(url);

  if (!res.ok) {
    const error: FetcherError = new Error("An error occurred while fetching the data.");
    error.info = await res.text();
    error.status = res.status;
    throw error;
  }

  return res.json();
};

const Dashboard = () => {
  const [from_date, set_from_date] = useState<Date>(
    startOfMonth(new Date())
  );
  const [to_date, set_to_date] = useState<Date>(endOfMonth(new Date()));
  const [selected_account, set_selected_account] = useState<string>("all");

  const summary_url = `/api/summary?from=${format(from_date, "yyyy-MM-dd")}&to=${format(to_date, "yyyy-MM-dd")}${selected_account !== "all" ? `&accountId=${selected_account}` : ""}`;
  const accounts_url = "/api/accounts";

  const { data: summary_data, error: summary_error, isLoading: summary_loading } = useSWR<SummaryResponse>(
    summary_url,
    fetcher
  );
  const { data: accounts_data, error: accounts_error } = useSWR<AccountsResponse>(
    accounts_url,
    fetcher
  );

  const accounts: Account[] = accounts_data?.data || [];
  const is_summary_loading = summary_loading || !summary_data;

  return (
    <div className="space-y-6">
      <DashboardHeader
        from_date={from_date}
        to_date={to_date}
        selected_account={selected_account}
        accounts={accounts}
        on_from_date_change={(date) => date && set_from_date(date)}
        on_to_date_change={(date) => date && set_to_date(date)}
        on_account_change={set_selected_account}
      />

      <SummaryCards
        total_income={summary_data?.data?.total_income || 0}
        total_expenses={summary_data?.data?.total_expenses || 0}
        net_balance={summary_data?.data?.net_balance || 0}
        income_change={12}
        expense_change={5}
        isLoading={is_summary_loading}
      />

      <div className="grid gap-6">
        <Card className="border-none drop-shadow-sm">
          <CardContent className="pt-6">
            {is_summary_loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading chart...</p>
                </div>
              </div>
            ) : (
              <ExpenseBreakdownChart
                data={summary_data?.data?.expense_breakdown || []}
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-none drop-shadow-sm">
          <CardContent className="pt-6">
            {is_summary_loading ? (
              <div className="flex items-center justify-center h-[400px]">
                <div className="flex flex-col items-center gap-2">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                  <p className="text-sm text-muted-foreground">Loading chart...</p>
                </div>
              </div>
            ) : (
              <MonthToMonthChart
                data={summary_data?.data?.month_to_month || []}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const LandingPage = () => {
  return (
    <div className="min-h-[calc(100vh-80px)] flex items-center justify-center px-4">
      <div className="max-w-4xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Track Your Expenses
            <br />
            <span className="text-primary">Effortlessly</span>
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Take control of your finances with Tracify. Monitor your spending, manage accounts, and gain insights into your financial habits.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <SignUpButton mode="modal">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </SignUpButton>
          <SignInButton mode="modal">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Sign In
            </Button>
          </SignInButton>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mt-16">
          <LandingCard
            icon={<TrendingUp className="h-8 w-8 text-primary mb-2" />}
            title="Track Spending"
            description="Monitor your expenses across different categories and see where your money goes."
          />
          <LandingCard
            icon={<Wallet className="h-8 w-8 text-primary mb-2" />}
            title="Manage Accounts"
            description="Keep track of multiple accounts and balances in one convenient place."
          />
          <LandingCard
            icon={<BarChart3 className="h-8 w-8 text-primary mb-2" />}
            title="Visual Insights"
            description="Get visual summaries and charts to understand your spending patterns."
          />
        </div>
      </div>
    </div>
  );
};

export default function Home() {
  return (
    <>
      <SignedOut>
        <LandingPage />
      </SignedOut>
      <SignedIn>
        <Dashboard />
      </SignedIn>
    </>
  );
}



type LandingCardProps = {
  icon: React.ReactNode;
  title: string;
  description: string;
}


export const LandingCard = ({ icon, title, description }: LandingCardProps) => {
  return (
    <Card className="border-none drop-shadow-sm">
      <CardContent className="">
        <div className="flex items-center gap-2">
          {icon}
          <h3 className="text-lg font-semibold mb-2"> {title}</h3>
        </div>
        <p className="text-sm text-muted-foreground text-left">
          {description}
        </p>
      </CardContent>
    </Card>
  );
};
