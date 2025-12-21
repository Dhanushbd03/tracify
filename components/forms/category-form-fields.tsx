"use client";

import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type CategoryFormData = {
  name: string;
};

type CategoryFormFieldsProps = {
  control: Control<CategoryFormData>;
};

export const CategoryFormFields = ({
  control,
}: CategoryFormFieldsProps) => {
  return (
    <FormField
      control={control}
      name="name"
      render={({ field }) => (
        <FormItem>
          <FormLabel>Category Name</FormLabel>
          <FormControl>
            <Input
              placeholder="e.g., Groceries"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )}
    />
  );
};

