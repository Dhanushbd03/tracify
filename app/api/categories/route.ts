import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull, asc } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { categories } from "@/db/schema";

const create_category_schema = z.object({
  name: z
    .string()
    .min(1, "Category name is required")
    .max(100, "Category name must be less than 100 characters")
    .trim(),
});

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Unauthorized",
            details: "Please sign in to view categories",
          },
        },
        { status: 401 }
      );
    }

    const data = await db
      .select({
        id: categories.id,
        name: categories.name,
      })
      .from(categories)
      .where(and(eq(categories.userId, userId), isNull(categories.deletedAt)))
      .orderBy(asc(categories.name));

    return NextResponse.json({
      success: true,
      data: data,
    });
  } catch (error) {
    console.error("[GET /api/categories] Error:", error);

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
          message: "Failed to fetch categories",
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
            details: "Please sign in to create a category",
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

    const validation_result = create_category_schema.safeParse(request_body);

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

    const { name } = validation_result.data;
    const trimmed_name = name.trim();

    if (trimmed_name.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Validation failed",
            details: "Category name cannot be empty",
            errors: [{ field: "name", message: "Category name is required" }],
          },
        },
        { status: 400 }
      );
    }

    try {
      const [category_data] = await db
        .insert(categories)
        .values({
          userId: userId,
          name: trimmed_name,
        })
        .returning();

      if (!category_data) {
        throw new Error("Failed to create category record");
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            id: category_data.id,
            name: category_data.name,
          },
        },
        { status: 201 }
      );
    } catch (db_error) {
      console.error("[POST /api/categories] Database error:", db_error);

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
        error_cause?.includes("unique constraint") ||
        error_cause?.includes("unique_name_per_user") ||
        error_message.includes("unique") ||
        error_message.includes("duplicate key") ||
        full_error.includes("unique constraint") ||
        full_error.includes("duplicate key")
      ) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Category already exists",
              details: "A category with this name already exists for your account",
            },
          },
          { status: 409 }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Failed to create category",
            details: error_message,
            ...(error_cause && error_cause !== error_message && { cause: error_cause }),
          },
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("[POST /api/categories] Unexpected error:", error);

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

