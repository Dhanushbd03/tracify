"use client";

import { Control } from "react-hook-form";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type AccountFormData = {
  name: string;
  initial_balance?: string;
};

type EditAccountFormData = {
  name: string;
  balance: string;
};

type AccountFormFieldsProps = {
  control: Control<AccountFormData>;
  show_balance?: boolean;
};

export const AccountFormFields = ({
  control,
  show_balance = true,
}: AccountFormFieldsProps) => {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Checking Account"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {show_balance && (
        <FormField
          control={control}
          name="initial_balance"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Initial Balance</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Enter the current balance for this account
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
      )}
    </>
  );
};

type EditAccountFormFieldsProps = {
  control: Control<EditAccountFormData>;
};

export const EditAccountFormFields = ({
  control,
}: EditAccountFormFieldsProps) => {
  return (
    <>
      <FormField
        control={control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account Name</FormLabel>
            <FormControl>
              <Input
                placeholder="e.g., Checking Account"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="balance"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Balance</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                {...field}
              />
            </FormControl>
            <FormDescription>
              Enter the current balance for this account
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};


