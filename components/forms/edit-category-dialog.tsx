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
import { CategoryFormFields } from "./category-form-fields";
import { useEffect, useState } from "react";

const edit_category_schema = z.object({
  name: z.string().min(1, "Category name is required"),
});

type EditCategoryFormData = z.infer<typeof edit_category_schema>;

type EditCategoryDialogProps = {
  category: {
    id: string;
    name: string;
  } | null;
  is_open: boolean;
  on_open_change: (open: boolean) => void;
  onSubmit: (data: EditCategoryFormData) => Promise<void>;
};

export const EditCategoryDialog = ({
  category,
  is_open,
  on_open_change,
  onSubmit,
}: EditCategoryDialogProps) => {
  const [is_submitting, setIsSubmitting] = useState(false);
  const [submit_error, setSubmitError] = useState<string | null>(null);

  const form = useForm<EditCategoryFormData>({
    resolver: zodResolver(edit_category_schema),
    defaultValues: {
      name: "",
    },
  });

  useEffect(() => {
    if (category && is_open) {
      form.reset({
        name: category.name,
      });
      setSubmitError(null);
    }
  }, [category, is_open, form]);

  const handle_submit = async (data: EditCategoryFormData) => {
    if (!category) return;

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
          : "Failed to update category. Please try again.";
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
              <DialogTitle>Edit Category</DialogTitle>
              <DialogDescription>
                Update your category information.
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
                onClick={() => on_open_change(false)}
                disabled={is_submitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={is_submitting}>
                {is_submitting ? "Updating..." : "Update Category"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};

