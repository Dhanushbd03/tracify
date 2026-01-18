"use client";

import { useState } from "react";
import { format } from "date-fns";
import { Calendar as CalendarIcon, User } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { UserButton } from "@clerk/nextjs";
import { cn } from "@/lib/utils";

interface DashboardHeaderProps {
  from_date: Date;
  to_date: Date;
  selected_account: string;
  accounts: Array<{ id: string; name: string }>;
  on_from_date_change: (date: Date | undefined) => void;
  on_to_date_change: (date: Date | undefined) => void;
  on_account_change: (account_id: string) => void;
}

export function DashboardHeader({
  from_date,
  to_date,
  selected_account,
  accounts,
  on_from_date_change,
  on_to_date_change,
  on_account_change,
}: DashboardHeaderProps) {
  return (
    <div className="flex flex-col gap-6 pb-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Financial Overview</h1>
          <p className="text-muted-foreground mt-1">
            Track your income, expenses, and net balance.
          </p>
        </div>
        <UserButton />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">From Date</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !from_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {from_date ? format(from_date, "dd/MM/yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={from_date}
                onSelect={on_from_date_change}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">To Date</span>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-9",
                  !to_date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {to_date ? format(to_date, "dd/MM/yyyy") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={to_date}
                onSelect={on_to_date_change}
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="flex flex-col gap-1.5 sm:col-span-2 lg:col-span-1">
          <span className="text-sm font-medium">Account</span>
          <Select value={selected_account} onValueChange={on_account_change}>
            <SelectTrigger className="w-full h-9">
              <SelectValue placeholder="Select account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((account) => (
                <SelectItem key={account.id} value={account.id}>
                  {account.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

