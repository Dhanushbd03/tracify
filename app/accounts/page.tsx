"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, TrendingUp } from "lucide-react";
import useSWR, { mutate } from "swr";
import MobileAccountCard from "@/components/mobile-account-card";
import { AddAccountDialog } from "@/components/forms/add-account-dialog";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error_data = await res.json().catch(() => ({ message: res.statusText }));
    const error: any = new Error(error_data.message || "Failed to fetch data");
    error.status = res.status;
    error.info = error_data;
    throw error;
  }
  return res.json();
};

const AccountsPage = () => {
  const { data, error } = useSWR("/api/accounts", fetcher);

  const total_balance = data?.data?.reduce((sum: number, account: any) => {
    return sum + parseFloat(account.balance || "0");
  }, 0) || 0;

  const format_balance = (balance: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(balance);
  };

  const handleDelete = async (accountId: string) => {
    await fetch(`/api/accounts/${accountId}`, {
      method: "DELETE",
    });
    mutate("/api/accounts");
  };

  const handle_add_account = async (data: {
    name: string;
    initial_balance?: string;
  }) => {
    const response = await fetch("/api/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        initial_balance: data.initial_balance || "0.00",
      }),
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({ 
        success: false,
        error: { message: response.statusText, details: response.statusText }
      }));
      
      const error_message = error_data?.error?.details || 
                           error_data?.error?.message || 
                           error_data?.message || 
                           `Failed to create account: ${response.statusText}`;
      
      throw new Error(error_message);
    }

    mutate("/api/accounts");
  };

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="border-none drop-shadow-sm">
            <CardContent className="flex flex-col items-center justify-center py-16">
              <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Failed to load accounts</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                {error.info?.message || error.message || "An error occurred while loading your accounts."}
              </p>
              <Button onClick={() => mutate("/api/accounts")} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Card className="border-none drop-shadow-sm">
            <CardContent className="flex items-center justify-center py-16">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading accounts...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Accounts</h1>
          <AddAccountDialog onSubmit={handle_add_account} />
        </div>

        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-2">TOTAL BALANCE</p>
          <p className="text-3xl sm:text-4xl font-bold mb-2">{format_balance(total_balance)}</p>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full text-xs font-medium">
              <TrendingUp className="h-3 w-3" />
              <span>+2.5% this month</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">YOUR ASSETS</h2>
          {data.data && data.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {data.data.map((account: any) => (
                <MobileAccountCard
                  key={account.id}
                  account={account}
                  onDelete={() => handleDelete(account.id)}
                />
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/25">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AddAccountDialog onSubmit={handle_add_account} />
                <p className="text-sm text-muted-foreground">Add another account</p>
              </CardContent>
            </Card>
          )}
        </div>

        {data.data && data.data.length > 0 && (
          <Card className="border-dashed border-2 border-muted-foreground/25 mt-4">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AddAccountDialog onSubmit={handle_add_account} />
              <p className="text-sm text-muted-foreground">Add another account</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default AccountsPage;
