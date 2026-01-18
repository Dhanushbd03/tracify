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
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowDownCircle, ArrowUpCircle, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TransactionFormData = {
  amount: string;
  type: "debit" | "credit";
  description: string;
  date: string;
  time: string;
  account_id: string;
  category_id?: string;
};

type TransactionFormFieldsProps = {
  control: Control<TransactionFormData>;
  accounts: Array<{ id: string; name: string }>;
  categories?: Array<{ id: string; name: string }>;
};

export const TransactionFormFields = ({
  control,
  accounts,
  categories = [],
}: TransactionFormFieldsProps) => {
  return (
    <>
      <FormField
        control={control}
        name="type"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Type</FormLabel>
            <FormControl>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={field.value === "debit" ? "default" : "outline"}
                  onClick={() => field.onChange("debit")}
                  className="flex-1"
                >
                  <ArrowDownCircle className="h-4 w-4 mr-2" />
                  Debit (Expense)
                </Button>
                <Button
                  type="button"
                  variant={field.value === "credit" ? "default" : "outline"}
                  onClick={() => field.onChange("credit")}
                  className="flex-1"
                >
                  <ArrowUpCircle className="h-4 w-4 mr-2" />
                  Credit (Income)
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <div className="grid grid-cols-2 gap-4">
        <FormField
          control={control}
          name="date"
          render={({ field }) => {
            const parse_date_utc = (date_str: string): Date | undefined => {
              if (!date_str) return undefined;
              const [year, month, day] = date_str.split("-").map(Number);
              if (isNaN(year) || isNaN(month) || isNaN(day)) return undefined;
              return new Date(Date.UTC(year, month - 1, day));
            };
            
            const format_date_utc = (date: Date): string => {
              const year = date.getUTCFullYear();
              const month = String(date.getUTCMonth() + 1).padStart(2, "0");
              const day = String(date.getUTCDate()).padStart(2, "0");
              return `${year}-${month}-${day}`;
            };
            
            const format_display_date = (date_str: string): string => {
              if (!date_str) return "";
              const date = parse_date_utc(date_str);
              if (!date) return "";
              return format_date_utc(date);
            };
            
            const date_value = field.value ? parse_date_utc(field.value) : undefined;
            
            return (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !date_value && "text-muted-foreground"
                        )}
                        type="button"
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {date_value ? format_display_date(field.value) : <span>Pick a date</span>}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={date_value}
                        onSelect={(date) => {
                          if (date) {
                            const utc_date = new Date(Date.UTC(
                              date.getFullYear(),
                              date.getMonth(),
                              date.getDate()
                            ));
                            field.onChange(format_date_utc(utc_date));
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </FormControl>
                <FormMessage />
              </FormItem>
            );
          }}
        />
        <FormField
          control={control}
          name="time"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Time *</FormLabel>
              <FormControl>
                <Input type="time" step="1" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </div>

      <FormField
        control={control}
        name="amount"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Amount</FormLabel>
            <FormControl>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Enter transaction description"
                rows={3}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="account_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Account *</FormLabel>
            <FormControl>
              <select
                {...field}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
              >
                <option value="">Select an account...</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={control}
        name="category_id"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category (Optional)</FormLabel>
            <FormControl>
              <select
                {...field}
                value={field.value || ""}
                onChange={(e) => field.onChange(e.target.value || undefined)}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
              >
                <option value="">No category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
};

