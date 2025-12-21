import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";

import db from "@/db";
import { categories } from "@/db/schema";

const patchSchema = z.object({
  name: z.string().min(1).max(100).trim().optional(),
});

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
            details: "Please sign in to update category",
          },
        },
        { status: 401 }
      );
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)));

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Category not found",
            details: "The category does not exist or you don't have access to it",
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
      const trimmed_name = parsedValues.data.name.trim();
      if (trimmed_name.length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: {
              message: "Validation failed",
              details: "Category name cannot be empty",
            },
          },
          { status: 400 }
        );
      }
      update_data.name = trimmed_name;
    }

    const [updated_category] = await db
      .update(categories)
      .set(update_data)
      .where(and(eq(categories.userId, userId), eq(categories.id, id), isNull(categories.deletedAt)))
      .returning();

    if (!updated_category) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Update failed",
            details: "Failed to update category",
          },
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: updated_category.id,
        name: updated_category.name,
      },
    });
  } catch (error) {
    console.error("[PATCH /api/categories/[id]] Error:", error);
    
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
    const error_obj = error as any;
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
          message: "Failed to update category",
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
            details: "Please sign in to delete category",
          },
        },
        { status: 401 }
      );
    }

    const [category] = await db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.userId, userId), isNull(categories.deletedAt)));

    if (!category) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: "Category not found",
            details: "The category does not exist or you don't have access to it",
          },
        },
        { status: 404 }
      );
    }

    await db
      .update(categories)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(categories.userId, userId), eq(categories.id, id)));

    return NextResponse.json({
      success: true,
      data: { id },
    });
  } catch (error) {
    console.error("[DELETE /api/categories/[id]] Error:", error);
    const error_message =
      error instanceof Error ? error.message : "An unexpected error occurred";
    return NextResponse.json(
      {
        success: false,
        error: {
          message: "Failed to delete category",
          details: error_message,
        },
      },
      { status: 500 }
    );
  }
}

