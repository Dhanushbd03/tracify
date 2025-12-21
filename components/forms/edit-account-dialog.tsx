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
import { EditAccountFormFields } from "./account-form-fields";
import { useEffect, useState } from "react";

const edit_account_schema = z.object({
  name: z.string().min(1, "Account name is required"),
  balance: z.string().min(1, "Balance is required"),
});

type EditAccountFormData = z.infer<typeof edit_account_schema>;

type EditAccountDialogProps = {
  account: {
    id: string;
    name: string;
    balance: string;
  } | null;
  is_open: boolean;
  on_open_change: (open: boolean) => void;
  onSubmit: (data: EditAccountFormData) => Promise<void>;
};

export const EditAccountDialog = ({
  account,
  is_open,
  on_open_change,
  onSubmit,
}: EditAccountDialogProps) => {
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const form = useForm<EditAccountFormData>({
    resolver: zodResolver(edit_account_schema),
    defaultValues: {
      name: "",
      balance: "",
    },
  });

  useEffect(() => {
    if (account && is_open) {
      form.reset({
        name: account.name,
        balance: account.balance,
      });
      setSubmitError(null);
    }
  }, [account, is_open, form]);

  const handle_submit = async (data: EditAccountFormData) => {
    if (!account) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await onSubmit(data);
      form.reset();
      on_open_change(false);
    } catch (error) {
      const error_message =
        error instanceof Error
          ? error.message
          : "Failed to update account. Please try again.";
      setSubmitError(error_message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={is_open} onOpenChange={on_open_change}>
      <DialogContent className="sm:max-w-[425px]">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handle_submit)}>
            <DialogHeader>
              <DialogTitle>Edit Account</DialogTitle>
              <DialogDescription>
                Update your account information and balance.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {submit_error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submit_error}</span>
                </div>
              )}
              <EditAccountFormFields control={form.control} />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => on_open_change(false)}
                disabled={is_submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={is_submitting}>
                {is_submitting ? "Updating..." : "Update Account"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};


