"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertCircle } from "lucide-react";
import useSWR from "swr";
import { format_balance } from "@/lib/amount-utils";
import { format_date_detailed, formatDateIST, formatTimeIST } from "@/lib/date-utils";

type BalanceHistoryItem = {
  id: string;
  balance: string;
  created_at: string | null;
  updated_at: string | null;
};

type Props = {
  account_id: string;
  account_name: string;
  is_open: boolean;
  on_open_change: (open: boolean) => void;
};

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

const BalanceHistoryDialog = ({ account_id, account_name, is_open, on_open_change }: Props) => {
  const { data, error, isLoading } = useSWR(
    is_open ? `/api/accounts/${account_id}/balance-history` : null,
    fetcher
  );


  return (
    <Dialog open={is_open} onOpenChange={on_open_change}>
      <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Balance History</DialogTitle>
          <DialogDescription>
            Historical balance records for {account_name}
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4">
          {isLoading && (
            <div className="flex items-center justify-center py-8">
              <div className="flex flex-col items-center gap-2">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm text-muted-foreground">Loading history...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <AlertCircle className="h-6 w-6 text-destructive" />
              </div>
              <h3 className="text-sm font-semibold mb-2">Failed to load history</h3>
              <p className="text-xs text-muted-foreground text-center max-w-sm">
                {error.info?.message || error.message || "An error occurred while loading balance history."}
              </p>
            </div>
          )}

          {!isLoading && !error && data && (
            <>
              {data.data && data.data.length > 0 ? (
                <div className="space-y-3">
                  {data.data.map((item: BalanceHistoryItem, index: number) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-md"
                    >
                      <div className="flex flex-col">
                        <p className="text-sm font-medium text-foreground">
                          {format_balance(item.balance)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateIST(item.created_at || "")} {formatTimeIST(item.created_at || "")}
                        </p>
                      </div>
                      {index > 0 && data.data[index - 1] && (
                        <div className="flex items-center gap-1">
                          {parseFloat(item.balance) > parseFloat(data.data[index - 1].balance) ? (
                            <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                              ↑
                            </span>
                          ) : parseFloat(item.balance) < parseFloat(data.data[index - 1].balance) ? (
                            <span className="text-xs text-red-600 dark:text-red-400 font-medium">
                              ↓
                            </span>
                          ) : null}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No balance history available yet.
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BalanceHistoryDialog;

