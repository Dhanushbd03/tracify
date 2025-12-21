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
import BalanceHistoryDialog from "@/components/balance-history-dialog";
import { EditAccountDialog } from "@/components/forms/edit-account-dialog";
import { mutate } from "swr";
import { 
  PiggyBank, 
  Wallet, 
  TrendingUp, 
  Clock, 
  Pencil, 
  MoreVertical,
  Trash
} from "lucide-react";

type AccountType = "savings" | "checking" | "investment" | "other";

type Props = {
  account: {
    id: string;
    name: string;
    balance: string;
  };
  onDelete: () => void;
  onEdit?: () => void;
  onHistory?: () => void;
};

const get_account_type = (name: string): AccountType => {
  const lower_name = name.toLowerCase();
  if (lower_name.includes("savings")) return "savings";
  if (lower_name.includes("checking")) return "checking";
  if (lower_name.includes("investment") || lower_name.includes("invest") || lower_name.includes("robinhood") || lower_name.includes("stock")) return "investment";
  return "other";
};

const get_account_icon = (type: AccountType) => {
  switch (type) {
    case "savings":
      return PiggyBank;
    case "checking":
      return Wallet;
    case "investment":
      return TrendingUp;
    default:
      return Wallet;
  }
};

const get_account_icon_color = (type: AccountType) => {
  switch (type) {
    case "savings":
      return "text-blue-600 bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400";
    case "checking":
      return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
    case "investment":
      return "text-purple-600 bg-purple-100 dark:bg-purple-900/30 dark:text-purple-400";
    default:
      return "text-primary bg-primary/10";
  }
};

const get_account_description = (name: string, type: AccountType): string => {
  if (type === "savings") return "Personal Savings";
  if (type === "checking") return "Daily Spending";
  if (type === "investment") return "Robinhood Stock";
  return name;
};

const MobileAccountCard = ({ account, onDelete, onEdit, onHistory }: Props) => {
  const [is_deleting, setIsDeleting] = useState(false);
  const [is_delete_dialog_open, setIsDeleteDialogOpen] = useState(false);
  const [is_history_dialog_open, setIsHistoryDialogOpen] = useState(false);
  const [is_edit_dialog_open, setIsEditDialogOpen] = useState(false);
  
  const account_type = get_account_type(account.name);
  const Icon = get_account_icon(account_type);
  const icon_color_class = get_account_icon_color(account_type);
  const description = get_account_description(account.name, account_type);

  const handle_history_click = () => {
    if (onHistory) {
      onHistory();
    } else {
      setIsHistoryDialogOpen(true);
    }
  };

  const handle_edit_click = () => {
    if (onEdit) {
      onEdit();
    } else {
      setIsEditDialogOpen(true);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setIsDeleteDialogOpen(false);
    } finally {
      setIsDeleting(false);
    }
  };

  const format_balance = (balance: string) => {
    const num = parseFloat(balance);
    if (isNaN(num)) return "₹0.00";
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(num);
  };

  return (
    <>
      <Card className="border-none drop-shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className={`rounded-full p-3 shrink-0 ${icon_color_class}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-1">
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-semibold text-foreground mb-0.5">
                    {account_type === "other" ? account.name : account_type.charAt(0).toUpperCase() + account_type.slice(1)}
                  </h3>
                  <p className="text-sm text-muted-foreground">{description}</p>
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
                      variant="destructive"
                      onClick={() => setIsDeleteDialogOpen(true)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
              <p className="text-xl font-semibold text-foreground mb-3">
                {format_balance(account.balance)}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1"
                  onClick={handle_history_click}
                >
                  <Clock className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  className="flex-1 bg-primary/10 text-primary hover:bg-primary/20"
                  onClick={handle_edit_click}
                >
                  <Pencil className="h-4 w-4 mr-2" />
                  Edit
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditAccountDialog
        account={account}
        is_open={is_edit_dialog_open}
        on_open_change={setIsEditDialogOpen}
        onSubmit={async (data) => {
          const update_data: { name?: string; balance?: string } = {};
          
          if (data.name.trim() !== account.name) {
            update_data.name = data.name.trim();
          }
          
          if (data.balance !== account.balance) {
            update_data.balance = data.balance;
          }

          if (Object.keys(update_data).length === 0) {
            return;
          }

          const response = await fetch(`/api/accounts/${account.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(update_data),
          });

          if (!response.ok) {
            const error_data = await response.json().catch(() => ({
              success: false,
              error: { message: response.statusText, details: response.statusText },
            }));

            const error_message =
              error_data?.error?.details ||
              error_data?.error?.message ||
              error_data?.message ||
              `Failed to update account: ${response.statusText}`;

            throw new Error(error_message);
          }

          await mutate("/api/accounts");
        }}
      />

      <BalanceHistoryDialog
        account_id={account.id}
        account_name={account.name}
        is_open={is_history_dialog_open}
        on_open_change={setIsHistoryDialogOpen}
      />

      <AlertDialog open={is_delete_dialog_open} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{account.name}"? This action cannot be undone and will remove all associated transactions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={is_deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={is_deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {is_deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default MobileAccountCard;

