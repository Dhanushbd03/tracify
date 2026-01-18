"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
} from "@/components/ui/form";
import { AlertCircle } from "lucide-react";
import { TransactionFormFields } from "./transaction-form-fields";
import { useEffect, useState } from "react";

const transaction_schema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    ),
  type: z.enum(["debit", "credit"]),
  description: z.string().min(1, "Description is required"),
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  account_id: z.string().min(1, "Account is required"),
  category_id: z.string().optional(),
});

type TransactionFormData = z.infer<typeof transaction_schema>;

type EditTransactionDialogProps = {
  transaction: any | null;
  accounts: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  is_open: boolean;
  on_open_change: (open: boolean) => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
};

export const EditTransactionDialog = ({
  transaction,
  accounts,
  categories = [],
  is_open,
  on_open_change,
  onSubmit,
}: EditTransactionDialogProps) => {
  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transaction_schema),
    defaultValues: {
      amount: "",
      type: "debit",
      description: "",
      date: "",
      time: "",
      account_id: "",
      category_id: undefined,
    },
  });

  const format_date_utc = (iso_date: string): string => {
    const date = new Date(iso_date);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, "0");
    const day = String(date.getUTCDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const format_time_utc = (iso_date: string): string => {
    const date = new Date(iso_date);
    const hours = String(date.getUTCHours()).padStart(2, "0");
    const minutes = String(date.getUTCMinutes()).padStart(2, "0");
    const seconds = String(date.getUTCSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  };

  useEffect(() => {
    if (transaction && is_open) {
      form.reset({
        amount: transaction.amount,
        type: transaction.type,
        description: transaction.description || "",
        date: format_date_utc(transaction.date),
        time: format_time_utc(transaction.date),
        account_id: transaction.accountId,
        category_id: transaction.categoryId || undefined,
      });
    }
  }, [transaction, is_open, form]);

  const [is_updating, setIsUpdating] = useState(false);
  const [update_error, setUpdateError] = useState<string | null>(null);

  const handle_submit = async (data: TransactionFormData) => {
    if (!transaction) return;

    setIsUpdating(true);
    setUpdateError(null);

    try {
      const [year, month, day] = data.date.split("-").map(Number);
      const [hours, minutes, seconds] = data.time.split(":").map(Number);
      const utc_date = new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds || 0));
      await onSubmit({ ...data, date: utc_date.toISOString() });
      form.reset();
      on_open_change(false);
    } catch (error) {
      const error_message =
        error instanceof Error
          ? error.message
          : "Failed to update transaction. Please try again.";
      setUpdateError(error_message);
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={is_open} onOpenChange={on_open_change}>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handle_submit)}>
            <DialogHeader>
              <DialogTitle>Edit Transaction</DialogTitle>
              <DialogDescription>
                Update the transaction details.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {update_error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{update_error}</span>
                </div>
              )}
              <TransactionFormFields
                control={form.control}
                accounts={accounts}
                categories={categories}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => on_open_change(false)}
                disabled={is_updating}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={is_updating}>
                {is_updating ? "Updating..." : "Update Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

