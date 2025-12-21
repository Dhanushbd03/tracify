import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import db from "@/db";
import {
  transactions,
  accounts,
} from "@/db/schema";
import { z } from "zod";

const import_schema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  data: z.array(z.union([
    z.record(z.string(), z.any()),
    z.array(z.any()),
  ])),
});

const validate_amount = (amount: string | number | null | undefined): string => {
  if (amount === null || amount === undefined || amount === "") {
    return "0.00";
  }
  const num = typeof amount === "string" ? parseFloat(amount.replace(/,/g, "")) : amount;
  if (isNaN(num) || !isFinite(num) || num < 0) {
    throw new Error(`Invalid amount: ${amount}`);
  }
  if (Math.abs(num) > 999999999999.99) {
    throw new Error("Amount exceeds maximum allowed value");
  }
  return num.toFixed(2);
};

const extract_date_time_from_description = (description: string): { date: Date; cleaned_description: string } | null => {
  const date_time_pattern = /(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const match = description.match(date_time_pattern);
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const hours = parseInt(match[4], 10);
    const minutes = parseInt(match[5], 10);
    const seconds = parseInt(match[6], 10);
    
    const date = new Date(year, month, day, hours, minutes, seconds);
    if (!isNaN(date.getTime())) {
      const cleaned_description = description.replace(date_time_pattern, "").trim();
      return { date, cleaned_description };
    }
  }
  return null;
};

const parse_date = (date_str: string | null | undefined, description: string = ""): Date => {
  const desc_date_time = extract_date_time_from_description(description);
  if (desc_date_time) {
    return desc_date_time.date;
  }

  if (!date_str) {
    throw new Error("Date is required");
  }

  const date_str_trimmed = String(date_str).trim();
  if (!date_str_trimmed) {
    throw new Error("Date cannot be empty");
  }

  const date = new Date(date_str_trimmed);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date format: ${date_str}`);
  }

  return date;
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
            details: "Please sign in to import transactions",
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

    const validation_result = import_schema.safeParse(request_body);

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

    const { accountId, data: csv_data } = validation_result.data;

    if (!csv_data || csv_data.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "No data to import",
            details: "CSV file appears to be empty",
          },
        },
        { status: 400 }
      );
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

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

    const valid_transactions: any[] = [];
    const errors: Array<{ row: number; error: string }> = [];

    const normalized_data = csv_data.map((row: any, index: number) => {
      if (Array.isArray(row)) {
        if (index === 0) {
          return null;
        }
        const headers = csv_data[0] as string[];
        if (!Array.isArray(headers)) {
          return null;
        }
        const row_obj: Record<string, any> = {};
        headers.forEach((header: string, col_index: number) => {
          if (header) {
            row_obj[header.trim()] = row[col_index] || "";
          }
        });
        return row_obj;
      }
      return row;
    }).filter((row: any) => row && typeof row === "object" && Object.keys(row).length > 0);

    normalized_data.forEach((row, index) => {
      try {
        const row_num = index + 1;

        if (!row || Object.keys(row).length === 0) {
          return;
        }

        const txn_date_str = row["date"] || row["Date"] || row["DATE"] || row["Txn Date"] || row["txn date"] || row["TXN DATE"] || "";
        let description = row["description"] || row["Description"] || row["DESCRIPTION"] || "";
        const debit_str = row["debit"] || row["Debit"] || row["DEBIT"] || "0";
        const credit_str = row["credit"] || row["Credit"] || row["CREDIT"] || "0";

        const desc_date_time = extract_date_time_from_description(description);
        let transaction_date: Date;
        let cleaned_description: string;

        if (desc_date_time) {
          transaction_date = desc_date_time.date;
          cleaned_description = desc_date_time.cleaned_description;
        } else {
          if (!txn_date_str || txn_date_str.trim() === "") {
            throw new Error("Date is required");
          }
          transaction_date = parse_date(txn_date_str, description);
          cleaned_description = description.trim();
        }

        description = cleaned_description;
        const debit_amount = validate_amount(debit_str);
        const credit_amount = validate_amount(credit_str);

        const debit_num = parseFloat(debit_amount);
        const credit_num = parseFloat(credit_amount);

        if (debit_num > 0 && credit_num > 0) {
          throw new Error("Both Debit and Credit cannot have values. Only one should have a value.");
        }

        if (debit_num === 0 && credit_num === 0) {
          throw new Error("Either Debit or Credit must have a value");
        }

        const transaction_type = debit_num > 0 ? "debit" : "credit";
        const amount_value = debit_num > 0 ? debit_amount : credit_amount;

        valid_transactions.push({
          accountId: accountId,
          amount: amount_value,
          type: transaction_type,
          description: description || null,
          date: transaction_date,
          categoryId: null,
        });
      } catch (row_error) {
        errors.push({
          row: index + 1,
          error: row_error instanceof Error ? row_error.message : "Unknown error",
        });
      }
    });

    if (errors.length > 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Validation failed",
            details: "Some rows failed validation. All transactions must be valid to import.",
            errors,
          },
        },
        { status: 400 }
      );
    }

    if (valid_transactions.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "No valid transactions to import",
            details: "No valid rows found in the CSV file",
          },
        },
        { status: 400 }
      );
    }

    try {
      await db.insert(transactions).values(valid_transactions);

      return NextResponse.json(
        {
          success: true,
          data: {
            imported: valid_transactions.length,
          },
        },
        { status: 201 }
      );
    } catch (db_error) {
      console.error("[POST /api/transactions/import] Database error:", db_error);

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
            message: "Failed to import transactions",
            details: error_message,
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[POST /api/transactions/import] Unexpected error:", error);

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
