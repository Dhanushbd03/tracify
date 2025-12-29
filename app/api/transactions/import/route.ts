import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { transactions, accounts } from "@/db/schema";
import { validate_amount } from "@/lib/amount-utils";
import { parse_date, extract_date_time_from_description } from "@/lib/date-utils";
import { create_error_response, create_success_response, extract_error_message } from "@/lib/error-utils";
import { normalize_csv_data, get_csv_field } from "@/lib/csv-utils";

const import_schema = z.object({
  accountId: z.string().min(1, "Account ID is required"),
  data: z.array(z.union([
    z.record(z.string(), z.any()),
    z.array(z.any()),
  ])),
});

export async function POST(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return create_error_response({
        message: "Unauthorized",
        details: "Please sign in to import transactions",
        status: 401,
      });
    }

    let request_body: unknown;
    try {
      request_body = await req.json();
    } catch (parse_error) {
      return create_error_response({
        message: "Invalid request body",
        details: "Request body must be valid JSON",
        status: 400,
      });
    }

    const validation_result = import_schema.safeParse(request_body);

    if (!validation_result.success) {
      const errors = validation_result.error.issues.map((err: z.ZodIssue) => ({
        field: err.path.join("."),
        error: err.message,
      }));

      return create_error_response({
        message: "Validation failed",
        details: "Please check your input and try again",
        status: 400,
        errors,
      });
    }

    const { accountId, data: csv_data } = validation_result.data;

    if (!csv_data || csv_data.length === 0) {
      return create_error_response({
        message: "No data to import",
        details: "CSV file appears to be empty",
        status: 400,
      });
    }

    const [account] = await db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, accountId), eq(accounts.userId, userId)));

    if (!account) {
      return create_error_response({
        message: "Account not found",
        details: "The selected account does not exist or you don't have access to it",
        status: 404,
      });
    }

    const valid_transactions: any[] = [];
    const errors: Array<{ row: number; error: string }> = [];
    const normalized_data = normalize_csv_data(csv_data);

    normalized_data.forEach((row, index) => {
      try {
        if (!row || Object.keys(row).length === 0) {
          return;
        }

        const txn_date_str = get_csv_field(row, "date", "");
        let description = get_csv_field(row, "description", "");
        const debit_str = get_csv_field(row, "debit", "0");
        const credit_str = get_csv_field(row, "credit", "0");

        let transaction_date: Date;

        if (txn_date_str && txn_date_str.trim() !== "") {
          try {
            transaction_date = parse_date(txn_date_str);
          } catch (date_error) {
            const desc_date_time = extract_date_time_from_description(description);
            if (desc_date_time) {
              transaction_date = desc_date_time;
            } else {
              throw date_error;
            }
          }
        } else {
          const desc_date_time = extract_date_time_from_description(description);
          if (desc_date_time) {
            transaction_date = desc_date_time;
          } else {
            throw new Error("Date is required (either in date field or description)");
          }
        }

        description = description.trim();
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
      return create_error_response({
        message: "Validation failed",
        details: "Some rows failed validation. All transactions must be valid to import.",
        status: 400,
        errors,
      });
    }

    if (valid_transactions.length === 0) {
      return create_error_response({
        message: "No valid transactions to import",
        details: "No valid rows found in the CSV file",
        status: 400,
      });
    }

    try {
      await db.insert(transactions).values(valid_transactions);

      return create_success_response(
        { imported: valid_transactions.length },
        201
      );
    } catch (db_error) {
      console.error("[POST /api/transactions/import] Database error:", db_error);
      const error_message = extract_error_message(db_error);

      return create_error_response({
        message: "Failed to import transactions",
        details: error_message,
        status: 500,
      });
    }
  } catch (error) {
    console.error("[POST /api/transactions/import] Unexpected error:", error);
    const error_message = extract_error_message(error);

    return create_error_response({
      message: "Internal server error",
      details: error_message,
      status: 500,
    });
  }
}
