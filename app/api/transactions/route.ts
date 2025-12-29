import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, lte, isNull, desc, ilike } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { transactions, accounts, categories, insertTransactionSchema } from "@/db/schema";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to view transactions",
          },
        },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const accountId = searchParams.get("accountId") || undefined;
    const search = searchParams.get("search") || undefined;

    const defaultTo = new Date();
    const defaultFrom = new Date(
      defaultTo.getFullYear(),
      defaultTo.getMonth() - 1,
      defaultTo.getDate(),
    );

    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to ? new Date(to) : defaultTo;

    const data = await db
      .select({
        id: transactions.id,
        date: transactions.date,
        type: transactions.type,
        amount: transactions.amount,
        description: transactions.description,
        category: categories.name,
        account: accounts.name,
        accountId: transactions.accountId,
        categoryId: transactions.categoryId,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(
        and(
          eq(accounts.userId, userId),
          isNull(transactions.deletedAt),
          accountId ? eq(transactions.accountId, accountId) : undefined,
          gte(transactions.date, fromDate),
          lte(transactions.date, toDate),
          search ? ilike(transactions.description, `%${search}%`) : undefined,
        ),
      )
      .orderBy(desc(transactions.date));

    const formatted_data = data.map((item) => ({
      id: item.id,
      date: item.date,
      type: item.type,
      amount: item.amount ? String(item.amount) : "0.00",
      description: item.description || "",
      category: item.category || "Uncategorized",                                 
      account: item.account,
      accountId: item.accountId,
      categoryId: item.categoryId,
    }));

    return NextResponse.json({
      success: true,
      data: formatted_data,
    });
  } catch (error) {
    console.error("[GET /api/transactions] Error:", error);

    const error_message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    const error_details =
      error instanceof Error && "cause" in error
        ? String(error.cause)
        : undefined;

    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to fetch transactions",
          details: error_message,
          ...(error_details && { cause: error_details }),
        },
      },
      { status: 500 }
    );
  }
}

const create_transaction_schema = z.object({
  amount: z
    .string()
    .min(1, "Amount is required")
    .refine(
      (val) => {
        const num = parseFloat(val);
        return !isNaN(num) && isFinite(num) && num > 0;
      },
      { message: "Amount must be a positive number" }
    ),
  type: z.enum(["debit", "credit"]),
  description: z
    .string()
    .min(1, "Description is required")
    .max(500, "Description must be less than 500 characters")
    .trim(),
  date: z.string().min(1, "Date is required"),
  account_id: z.string().min(1, "Account is required"),
  category_id: z.string().optional(),
});

type CreateTransactionInput = z.infer<typeof create_transaction_schema>;

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

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to create a transaction",
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

    const validation_result = create_transaction_schema.safeParse(request_body);

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

    const { amount, type, description, date, account_id, category_id } =
      validation_result.data;

    let amount_value: string;
    try {
      amount_value = validate_amount(amount);
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

    const transaction_date = new Date(date);
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

    try {
      const [account] = await db
        .select()
        .from(accounts)
        .where(and(eq(accounts.id, account_id), eq(accounts.userId, userId)));

      if (!account) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Account not found",
              details: "The selected account does not exist or you don't have access to it",
            },
          },
          { status: 404 }
        );
      }

      if (category_id) {
        const [category] = await db
          .select()
          .from(categories)
          .where(
            and(
              eq(categories.id, category_id),
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
      }

      const [transaction_data] = await db
        .insert(transactions)
        .values({
          amount: amount_value,
          type: type,
          description: description.trim(),
          date: transaction_date,
          accountId: account_id,
          categoryId: category_id || null,
        })
        .returning();

      if (!transaction_data) {
        throw new Error("Failed to create transaction record");
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: transaction_data.id,
            amount: amount_value,
            type: transaction_data.type,
            description: transaction_data.description,
            date: transaction_data.date,
            account_id: transaction_data.accountId,
            category_id: transaction_data.categoryId,
          },
        },
        { status: 201 }
      );
    } catch (db_error) {
      console.error("[POST /api/transactions] Database error:", db_error);

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

          if (error_obj.message) {
            if (
              error_obj.message.includes("Failed query") ||
              error_obj.message.includes("query")
            ) {
              if (error_obj.cause) {
                const cause_str = String(error_obj.cause);
                if (cause_str.includes("error:")) {
                  const match = cause_str.match(/error:\s*(.+?)(?:\s+at|$)/i);
                  if (match && match[1]) {
                    return match[1].trim();
                  }
                }
                return cause_str;
              }
            }
            return error_obj.message;
          }
        }

        if (typeof error === "string") {
          return error;
        }

        return "Database operation failed";
      };

      const error_message = extract_error_message(db_error);
      const error_obj = db_error as any;
      const error_cause = error_obj?.cause ? String(error_obj.cause) : undefined;
      const full_error = error_obj?.message || error_message;

      if (
        error_cause?.includes("foreign key constraint") ||
        error_message.includes("foreign key") ||
        full_error.includes("foreign key constraint")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Failed to create transaction",
              details:
                error_message ||
                "Database constraint violation. Please try again.",
            },
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Failed to create transaction",
            details: error_message,
            ...(error_cause &&
              error_cause !== error_message && { cause: error_cause }),
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[POST /api/transactions] Unexpected error:", error);

    const extract_error_message = (err: unknown): string => {
      if (err instanceof Error) {
        const error_obj = err as any;

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

        return error_obj.message || "An unexpected error occurred";
      }

      if (typeof err === "string") {
        return err;
      }

      return "An unexpected error occurred";
    };

    const error_message = extract_error_message(error);

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
