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
import { CategoryFormFields } from "./category-form-fields";
import { useState } from "react";

const category_schema = z.object({
  name: z.string().min(1, "Category name is required"),
});

type CategoryFormData = z.infer<typeof category_schema>;

type AddCategoryDialogProps = {
  onSubmit: (data: CategoryFormData) => Promise<void>;
};

export const AddCategoryDialog = ({
  onSubmit,
}: AddCategoryDialogProps) => {
  const [is_open, setIsOpen] = useState(false);
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(category_schema),
    defaultValues: {
      name: "",
    },
  });

  const handle_submit = async (data: CategoryFormData) => {
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
          : "Failed to create category. Please try again.";
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
              <DialogTitle>Add New Category</DialogTitle>
              <DialogDescription>
                Create a new category to organize your transactions.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              {submit_error && (
                <div className="flex items-center gap-2 p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{submit_error}</span>
                </div>
              )}
              <CategoryFormFields control={form.control} />
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
                {is_submitting ? "Creating..." : "Create Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

