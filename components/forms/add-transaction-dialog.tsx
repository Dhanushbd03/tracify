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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormField,
} from "@/components/ui/form";
import { AlertCircle, Plus } from "lucide-react";
import { TransactionFormFields } from "./transaction-form-fields";
import { useState } from "react";

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

type AddTransactionDialogProps = {
  accounts: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
  onSubmit: (data: TransactionFormData) => Promise<void>;
};

export const AddTransactionDialog = ({
  accounts,
  categories = [],
  onSubmit,
}: AddTransactionDialogProps) => {
  const [is_open, setIsOpen] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const form = useForm<TransactionFormData>({
    resolver: zodResolver(transaction_schema),
    defaultValues: {
      amount: "",
      type: "debit",
      description: "",
      date: new Date().toISOString().split("T")[0],
      time: new Date().toTimeString().slice(0, 8),
      account_id: "",
      category_id: undefined,
    },
  });

  const handle_submit = async (data: TransactionFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const date_time = new Date(`${data.date}T${data.time}`).toISOString();
      await onSubmit({ ...data, date: date_time });
      form.reset();
      setIsOpen(false);
    } catch (error) {
      const error_message =
        error instanceof Error
          ? error.message
          : "Failed to create transaction. Please try again.";
      setSubmitError(error_message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={is_open}
      onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          form.reset();
          setSubmitError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="size-4 mr-2" />
          Add Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handle_submit)}>
            <DialogHeader>
              <DialogTitle>Add New Transaction</DialogTitle>
              <DialogDescription>
                Record a new financial transaction.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {submit_error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submit_error}</span>
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
                onClick={() => setIsOpen(false)}
                disabled={is_submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={is_submitting}>
                {is_submitting ? "Creating..." : "Create Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

