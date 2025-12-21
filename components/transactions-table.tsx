"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { AlertCircle, ArrowDownCircle, ArrowUpCircle, Pencil, Trash, Save } from "lucide-react";
import { toast } from "sonner";
import useSWR from "swr";

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

const format_amount = (amount: string, type: string): string => {
  const num = parseFloat(amount);
  if (isNaN(num)) return "₹0.00";
  const formatted = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
  return type === "debit" ? `-${formatted}` : formatted;
};

type TransactionsTableProps = {
  account_id?: string;
  date_from?: string;
  date_to?: string;
  category_id?: string;
  search_query?: string;
  on_edit?: (transaction: any) => void;
  on_delete?: (transaction: any) => void;
  categories?: Array<{ id: string; name: string }>;
};

const TransactionsTable = ({ account_id, date_from, date_to, category_id, search_query, on_edit, on_delete, categories = [] }: TransactionsTableProps = {}) => {
  const params = new URLSearchParams();
  if (account_id) params.append("accountId", account_id);
  if (date_from) params.append("from", date_from);
  if (date_to) params.append("to", date_to);
  if (search_query) params.append("search", search_query);
  
  const url = `/api/transactions${params.toString() ? `?${params.toString()}` : ""}`;
  
  const { data, error, mutate } = useSWR(url, fetcher);
  const [category_changes, setCategoryChanges] = useState<Record<string, string | null>>({});
  const [is_saving, setIsSaving] = useState(false);
  const [is_mounted, setIsMounted] = useState(false);

  useEffect(() => {
    setCategoryChanges({});
  }, [data]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handle_category_change = (transaction_id: string, category_id: string | null) => {
    setCategoryChanges((prev) => {
      const original_transaction = data?.data?.find((t: any) => t.id === transaction_id);
      if (!original_transaction) {
        return {
          ...prev,
          [transaction_id]: category_id,
        };
      }
      
      const original_category_id = original_transaction.categoryId ?? null;
      const new_category_id = category_id ?? null;
      
      if (original_category_id === new_category_id) {
        const updated = { ...prev };
        delete updated[transaction_id];
        return updated;
      }
      
      return {
        ...prev,
        [transaction_id]: new_category_id,
      };
    });
  };

  const has_unsaved_changes = Object.keys(category_changes).length > 0;

  const handle_save = async () => {
    if (!has_unsaved_changes) return;

    setIsSaving(true);
    try {
      const update_promises = Object.entries(category_changes).map(async ([transaction_id, category_id]) => {
        const response = await fetch(`/api/transactions/${transaction_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ category_id: category_id || null }),
        });

        if (!response.ok) {
          const error_data = await response.json().catch(() => ({ message: response.statusText }));
          throw new Error(error_data.error?.details || error_data.message || "Failed to update transaction");
        }

        return response.json();
      });

      await Promise.all(update_promises);
      
      setCategoryChanges({});
      mutate();
      toast.success("Categories updated successfully!");
    } catch (error) {
      const error_message = error instanceof Error ? error.message : "Failed to save categories";
      toast.error("Save Failed", { description: error_message });
      console.error("Failed to save categories:", error);
    } finally {
      setIsSaving(false);
    }
  };

  if (error) {
    return (
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-destructive/10 p-4 mb-4">
          <AlertCircle className="h-8 w-8 text-destructive" />
        </div>
        <h3 className="text-lg font-semibold mb-2">Failed to load transactions</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
          {error.info?.error?.details || error.message || "An error occurred while loading transactions."}
        </p>
        <Button onClick={() => mutate()} variant="outline">
          Try Again
        </Button>
      </CardContent>
    );
  }

  if (!data) {
    return (
      <CardContent className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Loading transactions...</p>
        </div>
      </CardContent>
    );
  }

  if (!data.data || data.data.length === 0) {
    return (
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ArrowUpCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No transactions yet</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
          Start tracking your expenses by adding your first transaction or importing from a CSV file.
        </p>
      </CardContent>
    );
  }

  const filtered_transactions = data.data.filter((transaction: any) => {
    if (!category_id) return true;
    if (category_id === "uncategorized") {
      return !transaction.categoryId;
    }
    return transaction.categoryId === category_id;
  });

  if (filtered_transactions.length === 0) {
    return (
      <CardContent className="flex flex-col items-center justify-center py-16">
        <div className="rounded-full bg-muted p-4 mb-4">
          <ArrowUpCircle className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold mb-2">No transactions found</h3>
        <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
          No transactions match the selected category filter.
        </p>
      </CardContent>
    );
  }

  const save_button = has_unsaved_changes && is_mounted ? (
    <div className="fixed bottom-6 right-6 z-[9999]">
      <Button
        onClick={handle_save}
        disabled={is_saving}
        size="lg"
        className="shadow-lg"
      >
        <Save className="h-4 w-4 mr-2" />
        {is_saving ? "Saving..." : `Save Changes (${Object.keys(category_changes).length})`}
      </Button>
    </div>
  ) : null;

  const date_format = (given_date: Date , needed:string = "date") => {
    if (!given_date) return "";

    let date_value: Date;
    if (given_date instanceof Date) {
      date_value = given_date;
    } else if (typeof given_date === "string") {
      date_value = new Date(given_date);
    } else {
      date_value = new Date(String(given_date));
    }
    
    if (isNaN(date_value.getTime())) {
      return String(date_value);
    }
    
    const day = date_value.getDate().toString().padStart(2, "0");
    const month = (date_value.getMonth() + 1).toString().padStart(2, "0");
    const year = date_value.getFullYear();
    const time = date_value.getHours().toString().padStart(2, "0");
    const minutes = date_value.getMinutes().toString().padStart(2, "0");
    const seconds = date_value.getSeconds().toString().padStart(2, "0");
    if (needed === "time") {
      return `${time}:${minutes}:${seconds}`;
    }else{
      return `${day}/${month}/${year}`;
    }
  };


  return (
    <>
      {is_mounted && save_button && createPortal(save_button, document.body)}
      <div className="relative">
        <div className="rounded-md border">
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-[60px]">S.No</TableHead>
          <TableHead>Date</TableHead>
            <TableHead>Description</TableHead>
          <TableHead>Category</TableHead>
            <TableHead>Account</TableHead>
          <TableHead className="text-right">Amount</TableHead>
            {(on_edit || on_delete) && <TableHead className="w-[100px]">Actions</TableHead>}
        </TableRow>
      </TableHeader>
      <TableBody>
        {filtered_transactions.map((transaction: any, index: number) => (
          <TableRow key={transaction.id}>
              <TableCell className="text-muted-foreground">{index + 1}</TableCell>
              <TableCell className="font-medium">
               <div className="flex flex-col gap-2">
                <span>{date_format(transaction.date)}</span>
                <span className="text-xs text-muted-foreground">{date_format(transaction.date, "time")}</span>
                </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {transaction.type === "debit" ? (
                    <ArrowDownCircle className="h-4 w-4 text-destructive" />
                  ) : (
                    <ArrowUpCircle className="h-4 w-4 text-green-600" />
                  )}
                  <span>{transaction.description || "No description"}</span>
                </div>
              </TableCell>
              <TableCell>
                <select
                  value={category_changes[transaction.id] !== undefined 
                    ? (category_changes[transaction.id] || "") 
                    : (transaction.categoryId || "")}
                  onChange={(e) => {
                    const new_value = e.target.value === "" ? null : e.target.value;
                    handle_category_change(transaction.id, new_value);
                  }}
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs font-medium min-w-[120px] focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Uncategorized</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </TableCell>
              <TableCell className="text-muted-foreground">
                {transaction.account}
              </TableCell>
              <TableCell
                className={`text-right font-semibold ${
                  transaction.type === "debit"
                    ? "text-destructive"
                    : "text-green-600"
                }`}
              >
                {format_amount(transaction.amount, transaction.type)}
              </TableCell>
              {(on_edit || on_delete) && (
                <TableCell>
                  <div className="flex items-center gap-2 justify-end">
                    {on_edit && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => on_edit(transaction)}
                        className="h-8 w-8"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    )}
                    {on_delete && (
                      <DeleteTransactionButton
                        transaction={transaction}
                        on_delete={on_delete}
                      />
                    )}
                  </div>
                </TableCell>
              )}
          </TableRow>
        ))}
      </TableBody>
    </Table>
    </div>
      </div>
    </>
  );
};

type DeleteTransactionButtonProps = {
  transaction: any;
  on_delete: (transaction: any) => void;
};

const DeleteTransactionButton = ({ transaction, on_delete }: DeleteTransactionButtonProps) => {
  const [is_deleting, setIsDeleting] = useState(false);
  const [is_dialog_open, setIsDialogOpen] = useState(false);

  const handle_delete = async () => {
    setIsDeleting(true);
    try {
      await on_delete(transaction);
      setIsDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <AlertDialog open={is_dialog_open} onOpenChange={setIsDialogOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash className="h-4 w-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this transaction? This action cannot be undone.
            {transaction.description && (
              <span className="block mt-2 font-medium">
                Transaction: {transaction.description}
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={is_deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={handle_delete}
            disabled={is_deleting}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            {is_deleting ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default TransactionsTable;
