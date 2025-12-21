import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { transactions, accounts, categories } from "@/db/schema";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

const update_transaction_schema = z.object({
  amount: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    ),
  type: z.enum(["debit", "credit"]).optional(),
  description: z
    .string()
    .optional()
    .refine(
      (val) => !val || val.trim().length > 0,
      { message: "Description cannot be empty" }
    )
    .refine(
      (val) => !val || val.length <= 500,
      { message: "Description must be less than 500 characters" }
    ),
  date: z.string().optional(),
  account_id: z.string().optional(),
  category_id: z.string().optional().nullable(),
});

const validate_amount = (amount: string): string => {
  const num = parseFloat(amount);
  if (isNaN(num) || !isFinite(num) || num <= 0) {
    throw new Error("Amount must be a positive number");
  }
  if (Math.abs(num) > 999999999999.99) {
    throw new Error("Amount exceeds maximum allowed value");
  }
  return num.toFixed(2);
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
            details: "Please sign in to update transactions",
          },
        },
        { status: 401 }
      );
    }

    let request_body: unknown;
    try {
      request_body = await req.json();
    } catch (parse_error) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Invalid request body",
            details: "Request body must be valid JSON",
          },
        },
        { status: 400 }
      );
    }

    const validation_result = update_transaction_schema.safeParse(request_body);

    if (!validation_result.success) {
      const errors = validation_result.error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join("."),
        message: err.message,
      }));

      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Validation failed",
            details: "Please check your input and try again",
            errors,
          },
        },
        { status: 400 }
      );
    }

    const update_data = validation_result.data;

    let existing_transaction;
    try {
      [existing_transaction] = await db
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(transactions.id, id),
            eq(accounts.userId, userId),
            isNull(transactions.deletedAt)
          )
        )
        .limit(1);
    } catch (db_query_error) {
      console.error("[PATCH /api/transactions/[id]] Database query error:", db_query_error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Database error",
            details: db_query_error instanceof Error ? db_query_error.message : "Failed to query transaction",
          },
        },
        { status: 500 }
      );
    }

    if (!existing_transaction) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Transaction not found",
            details: "The transaction does not exist or you don't have access to it",
          },
        },
        { status: 404 }
      );
    }

    const update_values: any = {
      updatedAt: new Date(),
    };

    if (update_data.amount !== undefined) {
      try {
        update_values.amount = validate_amount(update_data.amount);
      } catch (amount_error) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              details:
                amount_error instanceof Error
                  ? amount_error.message
                  : "Invalid amount value",
              errors: [
                {
                  field: "amount",
                  message: "Amount must be a valid positive number",
                },
              ],
            },
          },
          { status: 400 }
        );
      }
    }

    if (update_data.type !== undefined) {
      update_values.type = update_data.type;
    }

    if (update_data.description !== undefined) {
      update_values.description = update_data.description.trim() || null;
    }

    if (update_data.date !== undefined) {
      const transaction_date = new Date(update_data.date);
      if (isNaN(transaction_date.getTime())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              details: "Invalid date format",
              errors: [{ field: "date", message: "Date must be a valid date" }],
            },
          },
          { status: 400 }
        );
      }
      update_values.date = transaction_date;
    }

    if (update_data.account_id !== undefined) {
      const [account] = await db
        .select()
        .from(accounts)
        .where(
          and(eq(accounts.id, update_data.account_id), eq(accounts.userId, userId))
        );

      if (!account) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Account not found",
              details:
                "The selected account does not exist or you don't have access to it",
            },
          },
          { status: 404 }
        );
      }
      update_values.accountId = update_data.account_id;
    }

    if (update_data.category_id !== undefined) {
      if (update_data.category_id === null || update_data.category_id === "") {
        update_values.categoryId = null;
      } else {
        const [category] = await db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.id, update_data.category_id),
              eq(categories.userId, userId),
              isNull(categories.deletedAt)
            )
          );

        if (!category) {
          return NextResponse.json(
            {
              success: false,
              error: {
                message: "Category not found",
                details:
                  "The selected category does not exist or you don't have access to it",
              },
            },
            { status: 404 }
          );
        }
        update_values.categoryId = update_data.category_id;
      }
    }

    try {
      const [updated_transaction] = await db
        .update(transactions)
        .set(update_values)
        .where(eq(transactions.id, id))
        .returning();

      if (!updated_transaction) {
        throw new Error("Failed to update transaction");
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: updated_transaction.id,
            amount: String(updated_transaction.amount),
            type: updated_transaction.type,
            description: updated_transaction.description,
            date: updated_transaction.date,
            account_id: updated_transaction.accountId,
            category_id: updated_transaction.categoryId,
          },
        },
        { status: 200 }
      );
    } catch (db_error) {
      console.error("[PATCH /api/transactions/[id]] Database error:", db_error);

      const extract_error_message = (error: unknown): string => {
        if (error instanceof Error) {
          const error_obj = error as any;

          if (error_obj.cause) {
            const cause_str = String(error_obj.cause);
            if (cause_str && cause_str !== "undefined") {
              if (cause_str.includes("error:")) {
                const match = cause_str.match(/error:\s*(.+?)(?:\s+at|$)/i);
                if (match && match[1]) {
                  return match[1].trim();
                }
              }
              return cause_str;
            }
          }

          return error_obj.message || "Database operation failed";
        }

        return "Database operation failed";
      };

      const error_message = extract_error_message(db_error);

      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Failed to update transaction",
            details: error_message,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[PATCH /api/transactions/[id]] Unexpected error:", error);

    const error_message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Internal server error",
          details: error_message,
        },
      },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const { id } = await params;
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to delete transactions",
          },
        },
        { status: 401 }
      );
    }

    let existing_transaction;
    try {
      [existing_transaction] = await db
        .select({
          id: transactions.id,
          accountId: transactions.accountId,
        })
        .from(transactions)
        .innerJoin(accounts, eq(transactions.accountId, accounts.id))
        .where(
          and(
            eq(transactions.id, id),
            eq(accounts.userId, userId),
            isNull(transactions.deletedAt)
          )
        )
        .limit(1);
    } catch (db_query_error) {
      console.error("[DELETE /api/transactions/[id]] Database query error:", db_query_error);
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Database error",
            details: db_query_error instanceof Error ? db_query_error.message : "Failed to query transaction",
          },
        },
        { status: 500 }
      );
    }

    if (!existing_transaction) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Transaction not found",
            details: "The transaction does not exist or you don't have access to it",
          },
        },
        { status: 404 }
      );
    }

    try {
      await db
        .update(transactions)
        .set({
          deletedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(transactions.id, id));

      return NextResponse.json(
        {
          success: true,
          data: {
            id,
            message: "Transaction deleted successfully",
          },
        },
        { status: 200 }
      );
    } catch (db_error) {
      console.error("[DELETE /api/transactions/[id]] Database error:", db_error);

      const extract_error_message = (error: unknown): string => {
        if (error instanceof Error) {
          const error_obj = error as any;

          if (error_obj.cause) {
            const cause_str = String(error_obj.cause);
            if (cause_str && cause_str !== "undefined") {
              if (cause_str.includes("error:")) {
                const match = cause_str.match(/error:\s*(.+?)(?:\s+at|$)/i);
                if (match && match[1]) {
                  return match[1].trim();
                }
              }
              return cause_str;
            }
          }

          return error_obj.message || "Database operation failed";
        }

        return "Database operation failed";
      };

      const error_message = extract_error_message(db_error);

      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Failed to delete transaction",
            details: error_message,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[DELETE /api/transactions/[id]] Unexpected error:", error);

    const error_message =
      error instanceof Error ? error.message : "An unexpected error occurred";

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Internal server error",
          details: error_message,
        },
      },
      { status: 500 }
    );
  }
}

