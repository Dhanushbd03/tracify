import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { accounts, balances, insertAccountSchema } from "@/db/schema";
import type { AccountsResponse } from "@/models";

const create_account_schema = z.object({
  name: z
    .string()
    .min(1, "Account name is required")
    .max(100, "Account name must be less than 100 characters")
    .trim(),
  initial_balance: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val || val === "") return true;
        const num = parseFloat(val);
        return !isNaN(num) && isFinite(num);
      },
      { message: "Initial balance must be a valid number" }
    ),
});

type CreateAccountInput = z.infer<typeof create_account_schema>;

const format_balance = (balance: string | null | undefined): string => {
  if (balance === null || balance === undefined) return "0.00";
  const num = parseFloat(String(balance));
  if (isNaN(num)) return "0.00";
  return num.toFixed(2);
};

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

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to view your accounts",
          },
        },
        { status: 401 }
      );
    }

    const data = await db
      .select({
        id: accounts.id,
        name: accounts.name,
        balance: balances.balance,
      })
      .from(accounts)
      .leftJoin(balances, eq(accounts.balanceId, balances.id))
      .where(eq(accounts.userId, userId));

    const formatted_data = data.map((item) => ({
      id: item.id,
      name: item.name,
      balance: format_balance(item.balance),
    }));

    const response: AccountsResponse = {
      success: true,
      data: formatted_data,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/accounts] Error:", error);

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
          message: "Failed to fetch accounts",
          details: error_message,
          ...(error_details && { cause: error_details }),
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to create an account",
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

    const validation_result = create_account_schema.safeParse(request_body);

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

    const { name, initial_balance } = validation_result.data;
    const trimmed_name = name.trim();

    if (trimmed_name.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Validation failed",
            details: "Account name cannot be empty",
            errors: [{ field: "name", message: "Account name is required" }],
          },
        },
        { status: 400 }
      );
    }

    let balance_value: string;
    try {
      balance_value = initial_balance
        ? validate_balance(initial_balance)
        : "0.00";
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
            errors: [
              {
                field: "initial_balance",
                message: "Balance must be a valid number",
              },
            ],
          },
        },
        { status: 400 }
      );
    }

    try {
      const [account_data] = await db
        .insert(accounts)
        .values({
          userId: userId,
          name: trimmed_name,
          balanceId: null,
        })
        .returning();

      if (!account_data) {
        throw new Error("Failed to create account record");
      }

      const [balance_data] = await db.insert(balances).values({
        accountId: account_data.id,
        balance: balance_value,
      }).returning();

      if (!balance_data) {
        throw new Error("Failed to create balance record");
      }

      await db
        .update(accounts)
        .set({ balanceId: balance_data.id, updatedAt: new Date() })
        .where(eq(accounts.id, account_data.id));

      return NextResponse.json(
        {
          success: true,
          data: {
            id: account_data.id,
            name: account_data.name,
            balance: balance_value,
          },
        },
        { status: 201 }
      );
    } catch (db_error) {
      console.error("[POST /api/accounts] Database error:", db_error);

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
            if (error_obj.message.includes("Failed query") || error_obj.message.includes("query")) {
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
              message: "Failed to create account",
              details: error_message || "Database constraint violation. Please try again.",
            },
          },
          { status: 500 }
        );
      }

      if (
        error_cause?.includes("unique constraint") ||
        error_message.includes("unique") ||
        full_error.includes("unique constraint")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Account already exists",
              details: error_message || "An account with this name may already exist",
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Failed to create account",
            details: error_message,
            ...(error_cause && error_cause !== error_message && { cause: error_cause }),
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[POST /api/accounts] Unexpected error:", error);

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
