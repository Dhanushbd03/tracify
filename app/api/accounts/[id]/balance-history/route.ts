import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, desc } from "drizzle-orm";

import db from "@/db";
import { accounts, balances } from "@/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const format_balance = (balance: string | null | undefined): string => {
  if (balance === null || balance === undefined) return "0.00";
  const num = parseFloat(String(balance));
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
};

export async function GET(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to view balance history",
          },
        },
        { status: 401 }
      );
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.userId, userId)));

    if (!account) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Account not found",
            details: "The account does not exist or you don't have access to it",
          },
        },
        { status: 404 }
      );
    }

    const balance_history = await db
      .select({
        id: balances.id,
        balance: balances.balance,
        created_at: balances.createdAt,
        updated_at: balances.updatedAt,
      })
      .from(balances)
      .where(eq(balances.accountId, id))
      .orderBy(desc(balances.createdAt));

    const formatted_data = balance_history.map((item) => ({
      id: item.id,
      balance: format_balance(item.balance),
      created_at: item.created_at?.toISOString() || null,
      updated_at: item.updated_at?.toISOString() || null,
    }));

    return NextResponse.json({
      success: true,
      data: formatted_data,
    });
  } catch (error) {
    console.error("[GET /api/accounts/[id]/balance-history] Error:", error);

    const error_message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to fetch balance history",
          details: error_message,
        },
      },
      { status: 500 }
    );
  }
}


