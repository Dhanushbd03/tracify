"use client";

import { useState } from "react";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash, Wallet } from "lucide-react";

type Props = {
    account: {
        id: string;
        name: string;
        balance: string;
    }
    onDelete: () => void;
}

const AccountCard = ({ account, onDelete }: Props) => {
    const [is_deleting, setIsDeleting] = useState(false);

    const handleDelete = async () => {
        setIsDeleting(true);
        try {
            await onDelete();
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
        <Card className="border-none drop-shadow-sm hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between gap-x-4 pb-3">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="rounded-full bg-primary/10 p-2 shrink-0">
                        <Wallet className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex flex-col gap-y-0.5 min-w-0 flex-1">
                        <CardTitle className="text-lg font-semibold line-clamp-1">
                            {account.name}
                        </CardTitle>
                    </div>
                </div>
                <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button 
                            variant="ghost" 
                            size="icon"
                            className="shrink-0"
                            disabled={is_deleting}
                        >
                            <Trash className="size-4 text-muted-foreground hover:text-destructive transition-colors" />
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Account</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{account.name}"? This action cannot be undone and will remove all associated transactions.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDelete}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </CardHeader>
            <CardContent className="pt-0">
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground font-medium">Balance</p>
                    <p className="text-lg font-semibold">{format_balance(account.balance)}</p>
                </div>
            </CardContent>
        </Card>
    );
};

export default AccountCard;
