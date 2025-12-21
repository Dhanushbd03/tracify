import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { accounts, balances, insertAccountSchema } from "@/db/schema";

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
  balance: z.string().optional(),
});

const validate_balance = (balance: string): string => {
  const num = parseFloat(balance);
  if (isNaN(num) || !isFinite(num)) {
    throw new Error("Balance must be a valid number");
  }
  if (Math.abs(num) > 999999999999.99) {
    throw new Error("Balance exceeds maximum allowed value");
  }
  return num.toFixed(2);
};

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to update account",
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

    const values = await req.json();
    const parsedValues = patchSchema.safeParse(values);
    if (!parsedValues.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Validation failed",
            details: "Invalid request body",
          },
        },
        { status: 400 }
      );
    }

    const update_data: { name?: string; updatedAt: Date } = {
      updatedAt: new Date(),
    };

    if (parsedValues.data.name !== undefined) {
      update_data.name = parsedValues.data.name.trim();
    }

    if (parsedValues.data.balance !== undefined) {
      let balance_value: string;
      try {
        balance_value = validate_balance(parsedValues.data.balance);
      } catch (balance_error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              details:
                balance_error instanceof Error
                  ? balance_error.message
                  : "Invalid balance value",
            },
          },
          { status: 400 }
        );
      }

      const [balance_data] = await db.insert(balances).values({
        accountId: id,
        balance: balance_value,
      }).returning();

      if (!balance_data) {
        throw new Error("Failed to create balance record");
      }

      await db
        .update(accounts)
        .set({ balanceId: balance_data.id, updatedAt: new Date() })
        .where(eq(accounts.id, id));
    }

    const [updated_account] = await db
      .update(accounts)
      .set(update_data)
      .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
      .returning();

    if (!updated_account) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Update failed",
            details: "Failed to update account",
          },
        },
        { status: 500 }
      );
    }

    const [current_balance] = await db
      .select()
      .from(balances)
      .where(eq(balances.id, updated_account.balanceId || ""));

    return NextResponse.json({
      success: true,
      data: {
        id: updated_account.id,
        name: updated_account.name,
        balance: current_balance?.balance || "0.00",
      },
    });
  } catch (error) {
    console.error("[PATCH /api/accounts/[id]] Error:", error);
    const error_message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to update account",
          details: error_message,
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const [data] = await db
    .delete(accounts)
    .where(and(eq(accounts.userId, userId), eq(accounts.id, id)))
    .returning({
      id: accounts.id,
    });

  if (!data) {
    return new NextResponse("Not Found", { status: 404 });
  }

  return NextResponse.json({ data });
}
