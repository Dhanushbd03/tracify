"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertCircle, Tag, MoreVertical, Pencil, Trash } from "lucide-react";
import useSWR, { mutate } from "swr";
import { AddCategoryDialog } from "@/components/forms/add-category-dialog";
import { EditCategoryDialog } from "@/components/forms/edit-category-dialog";

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

const CategoriesPage = () => {
  const { data, error } = useSWR("/api/categories", fetcher);
  const [editing_category, setEditingCategory] = useState<{ id: string; name: string } | null>(null);
  const [is_edit_dialog_open, setIsEditDialogOpen] = useState(false);
  const [deleting_category_id, setDeletingCategoryId] = useState<string | null>(null);
  const [is_delete_dialog_open, setIsDeleteDialogOpen] = useState(false);
  const [is_deleting, setIsDeleting] = useState(false);

  const handle_add_category = async (data: {
    name: string;
  }) => {
    const response = await fetch("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
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
        `Failed to create category: ${response.statusText}`;

      throw new Error(error_message);
    }

    mutate("/api/categories");
  };

  const handle_edit_category = async (data: { name: string }) => {
    if (!editing_category) return;

    const response = await fetch(`/api/categories/${editing_category.id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: data.name,
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
        `Failed to update category: ${response.statusText}`;

      throw new Error(error_message);
    }

    mutate("/api/categories");
  };

  const handle_delete_category = async () => {
    if (!deleting_category_id) return;

    setIsDeleting(true);
    try {
      const response = await fetch(`/api/categories/${deleting_category_id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const error_data = await response.json().catch(() => ({
          success: false,
          error: { message: response.statusText, details: response.statusText }
        }));

        const error_message = error_data?.error?.details ||
          error_data?.error?.message ||
          error_data?.message ||
          `Failed to delete category: ${response.statusText}`;

        throw new Error(error_message);
      }

      mutate("/api/categories");
      setIsDeleteDialogOpen(false);
      setDeletingCategoryId(null);
    } catch (error) {
      console.error("Failed to delete category:", error);
      throw error;
    } finally {
      setIsDeleting(false);
    }
  };

  const open_edit_dialog = (category: { id: string; name: string }) => {
    setEditingCategory(category);
    setIsEditDialogOpen(true);
  };

  const open_delete_dialog = (category_id: string) => {
    setDeletingCategoryId(category_id);
    setIsDeleteDialogOpen(true);
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
              <h3 className="text-lg font-semibold mb-2">Failed to load categories</h3>
              <p className="text-sm text-muted-foreground mb-6 text-center max-w-sm">
                {error.info?.message || error.message || "An error occurred while loading your categories."}
              </p>
              <Button onClick={() => mutate("/api/categories")} variant="outline">
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
                <p className="text-sm text-muted-foreground">Loading categories...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <div className="pt-2 pb-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">Categories</h1>
          <AddCategoryDialog onSubmit={handle_add_category} />
        </div>

        <div className="mb-4">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">YOUR CATEGORIES ( {data.data.length} )</h2>
          {data.data && data.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {data.data.map((category: any) => (
                <Card key={category.id} className="border-none drop-shadow-sm">
                  <CardContent className="p-2 py-0">
                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-primary/10 p-2">
                        <Tag className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{category.name}</p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 shrink-0"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => open_edit_dialog(category)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => open_delete_dialog(category.id)}
                            className="text-destructive"
                          >
                            <Trash className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed border-2 border-muted-foreground/25">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <AddCategoryDialog onSubmit={handle_add_category} />
                <p className="text-sm text-muted-foreground mt-4">Add your first category</p>
              </CardContent>
            </Card>
          )}
        </div>

        {data.data && data.data.length > 0 && (
          <Card className="border-dashed border-2 border-muted-foreground/25 mt-4">
            <CardContent className="flex flex-col items-center justify-center py-8">
              <AddCategoryDialog onSubmit={handle_add_category} />
              <p className="text-sm text-muted-foreground mt-4">Add another category</p>
            </CardContent>
          </Card>
        )}
      </div>

      <EditCategoryDialog
        category={editing_category}
        is_open={is_edit_dialog_open}
        on_open_change={(open) => {
          setIsEditDialogOpen(open);
          if (!open) {
            setEditingCategory(null);
          }
        }}
        onSubmit={handle_edit_category}
      />

      <AlertDialog open={is_delete_dialog_open} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this category? This action cannot be undone. Transactions using this category will have their category set to null.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={is_deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handle_delete_category}
              disabled={is_deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {is_deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CategoriesPage;

