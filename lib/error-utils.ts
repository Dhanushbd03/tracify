import { NextResponse } from "next/server";

export const extract_error_message = (error: unknown): string => {
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

    return error_obj.message || "An unexpected error occurred";
  }

  if (typeof error === "string") {
    return error;
  }

  return "An unexpected error occurred";
};

type ErrorResponseOptions = {
  message: string;
  details?: string;
  status?: number;
  errors?: Array<{ field?: string; row?: number; error: string }>;
};

export const create_error_response = (options: ErrorResponseOptions) => {
  const { message, details, status = 500, errors } = options;
  
  return NextResponse.json(
    {
      success: false,
      error: {
        message,
        ...(details && { details }),
        ...(errors && { errors }),
      },
    },
    { status }
  );
};

export const create_success_response = (data: any, status: number = 200) => {
  return NextResponse.json(
    {
      success: true,
      data,
    },
    { status }
  );
};

