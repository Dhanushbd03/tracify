"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CsvUploadButton from "@/components/csv-upload-button";
import TransactionsTable from "@/components/transactions-table";
import { AddTransactionDialog } from "@/components/forms/add-transaction-dialog";
import { EditTransactionDialog } from "@/components/forms/edit-transaction-dialog";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";
import { endOfMonth, format, startOfMonth } from "date-fns";
import { Calendar as CalendarIcon, Search } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) {
    const error_data = await res.json().catch(() => ({ message: res.statusText }));
    const error: any = new Error(error_data.error?.details || error_data.message || "Failed to fetch data");
    error.status = res.status;
    error.info = error_data;
    throw error;
  }
  return res.json();
};

const TransactionsPage = () => {
  const { data: accounts_data } = useSWR("/api/accounts", fetcher);
  const { data: categories_data } = useSWR("/api/categories", fetcher);
  const [selected_account_id, setSelectedAccountId] = useState<string>("");
  const [selected_category_id, setSelectedCategoryId] = useState<string>("");
  const [search_query, setSearchQuery] = useState<string>("");

  const default_to = endOfMonth(new Date());
  const default_from = startOfMonth(default_to);

  const [from_date, setFromDate] = useState<Date>(default_from);
  const [to_date, setToDate] = useState<Date>(default_to);

  const [is_edit_dialog_open, setIsEditDialogOpen] = useState(false);
  const [editing_transaction, setEditingTransaction] = useState<any>(null);

  const refresh_transactions = () => {
    const params = new URLSearchParams();
    if (selected_account_id) params.append("accountId", selected_account_id);
    if (from_date) params.append("from", format(from_date, "yyyy-MM-dd"));
    if (to_date) params.append("to", format(to_date, "yyyy-MM-dd"));
    if (search_query) params.append("search", search_query);
    const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ""}`;
    mutate(url);
  };

  const handle_from_date_change = (date: Date | undefined) => {
    if (date) {
      setFromDate(date);
    }
  };

  const handle_to_date_change = (date: Date | undefined) => {
    if (date) {
      setToDate(date);
    }
  };

  useEffect(() => {
    refresh_transactions();
  }, [from_date, to_date, selected_account_id, selected_category_id, search_query]);

  const handle_search_keydown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      refresh_transactions();
    }
  };

  const handle_add_transaction = async (data: {
    amount: string;
    type: "debit" | "credit";
    description: string;
    date: string;
    account_id: string;
    category_id?: string;
  }) => {
    const response = await fetch("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: data.amount,
        type: data.type,
        description: data.description,
        date: data.date,
        account_id: data.account_id,
        category_id: data.category_id || undefined,
      }),
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(
        error_data.error?.details ||
        error_data.error?.message ||
        error_data.message ||
        `Failed to create transaction: ${response.statusText}`
      );
    }

    refresh_transactions();
  };

  const handle_edit_click = (transaction: any) => {
    setEditingTransaction(transaction);
    setIsEditDialogOpen(true);
  };

  const handle_update_transaction = async (data: {
    amount: string;
    type: "debit" | "credit";
    description: string;
    date: string;
    account_id: string;
    category_id?: string;
  }) => {
    if (!editing_transaction) return;

    const response = await fetch(`/api/transactions/${editing_transaction.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: data.amount,
        type: data.type,
        description: data.description,
        date: data.date,
        account_id: data.account_id,
        category_id: data.category_id || null,
      }),
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(
        error_data.error?.details ||
        error_data.error?.message ||
        error_data.message ||
        `Failed to update transaction: ${response.statusText}`
      );
    }

    setIsEditDialogOpen(false);
    setEditingTransaction(null);
    refresh_transactions();
  };

  const handle_delete_transaction = async (transaction: any) => {
    const response = await fetch(`/api/transactions/${transaction.id}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const error_data = await response.json().catch(() => ({ message: response.statusText }));
      const error_message =
        error_data.error?.details ||
        error_data.error?.message ||
        error_data.message ||
        `Failed to delete transaction: ${response.statusText}`;
      toast.error("Delete Failed", {
        description: error_message,
      });
      throw new Error(error_message);
    }

    toast.success("Transaction deleted successfully");
    refresh_transactions();
  };

  const handle_csv_upload = async (data: any[], account_id: string) => {
    try {
      const response = await fetch("/api/transactions/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ accountId: account_id, data }),
      });

      const result = await response.json();

      if (!response.ok) {
        const error_data = result;
        const error_message = error_data.error?.message || "Failed to import transactions";
        const errors = error_data.error?.errors || [];

        const error_obj: any = new Error(error_message);
        error_obj.errors = errors;
        error_obj.error_message = error_message;
        throw error_obj;
      }

      refresh_transactions();

      if (result.success && result.data) {
        const { imported } = result.data;
        toast.success(`Successfully imported ${imported} transaction${imported !== 1 ? "s" : ""}!`);
      } else {
        toast.success("Transactions imported successfully!");
      }
    } catch (error) {
      const error_message = error instanceof Error ? error.message : "Failed to import transactions";
      console.error("Failed to import transactions:", error);
      throw error;
    }
  };

  return (
    <div className="max-w-screen-2xl mx-auto w-full pb-10 px-2 sm:px-4 md:px-0">
      <Card className="border-none drop-shadow-sm overflow-hidden">
        <CardHeader className="gap-y-4 px-4 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <CardTitle className="text-xl sm:text-2xl font-semibold">Transaction History</CardTitle>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {accounts_data?.data && accounts_data.data.length > 0 && (
                <>
                  <AddTransactionDialog
                    accounts={accounts_data.data}
                    categories={categories_data?.data || []}
                    onSubmit={handle_add_transaction}
                  />
                  <CsvUploadButton
                    onUpload={handle_csv_upload}
                    accounts={accounts_data.data}
                  />
                </>
              )}
            </div>
          </div>
          <EditTransactionDialog
            transaction={editing_transaction}
            accounts={accounts_data?.data || []}
            categories={categories_data?.data || []}
            is_open={is_edit_dialog_open}
            on_open_change={(open) => {
              setIsEditDialogOpen(open);
              if (!open) {
                setEditingTransaction(null);
              }
            }}
            onSubmit={handle_update_transaction}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 pt-2">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="search-input" className="text-sm font-medium">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="search-input"
                  type="text"
                  placeholder="Search transactions..."
                  value={search_query}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handle_search_keydown}
                  className="h-9 w-full pl-8"
                />
              </div>
            </div>
            {accounts_data?.data && accounts_data.data.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="account-filter" className="text-sm font-medium">
                  Account
                </label>
                <select
                  id="account-filter"
                  value={selected_account_id}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Accounts</option>
                  {accounts_data.data.map((account: any) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {categories_data?.data && categories_data.data.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label htmlFor="category-filter" className="text-sm font-medium">
                  Category
                </label>
                <select
                  id="category-filter"
                  value={selected_category_id}
                  onChange={(e) => setSelectedCategoryId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">All Categories</option>
                  <option value="uncategorized">Uncategorized</option>
                  {categories_data.data.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date-from" className="text-sm font-medium">
                From
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !from_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {from_date ? format(from_date, "dd/MM/yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={from_date}
                    onSelect={handle_from_date_change}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="date-to" className="text-sm font-medium">
                To
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-9",
                      !to_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {to_date ? format(to_date, "dd/MM/yyyy") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={to_date}
                    onSelect={handle_to_date_change}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TransactionsTable
            account_id={selected_account_id || undefined}
            date_from={format(from_date, "yyyy-MM-dd")}
            date_to={format(to_date, "yyyy-MM-dd")}
            category_id={selected_category_id || undefined}
            search_query={search_query || undefined}
            on_edit={handle_edit_click}
            on_delete={handle_delete_transaction}
            categories={categories_data?.data || []}
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default TransactionsPage;
