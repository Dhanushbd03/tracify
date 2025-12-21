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
} from "@/components/ui/form";
import { AlertCircle, Plus } from "lucide-react";
import { AccountFormFields } from "./account-form-fields";
import { useState } from "react";

const account_schema = z.object({
  name: z.string().min(1, "Account name is required"),
  initial_balance: z.string().optional(),
});

type AccountFormData = z.infer<typeof account_schema>;

type AddAccountDialogProps = {
  onSubmit: (data: AccountFormData) => Promise<void>;
};

export const AddAccountDialog = ({
  onSubmit,
}: AddAccountDialogProps) => {
  const [is_open, setIsOpen] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const form = useForm<AccountFormData>({
    resolver: zodResolver(account_schema),
    defaultValues: {
      name: "",
      initial_balance: "",
    },
  });

  const handle_submit = async (data: AccountFormData) => {
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(data);
      form.reset();
      setIsOpen(false);
    } catch (error) {
      const error_message =
        error instanceof Error
          ? error.message
          : "Failed to create account. Please try again.";
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
        <Button size="icon" className="h-10 w-10 rounded-full bg-primary">
          <Plus className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handle_submit)}>
            <DialogHeader>
              <DialogTitle>Add New Account</DialogTitle>
              <DialogDescription>
                Create a new account to track your transactions and balances.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {submit_error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submit_error}</span>
                </div>
              )}
              <AccountFormFields control={form.control} />
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
                {is_submitting ? "Creating..." : "Create Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


