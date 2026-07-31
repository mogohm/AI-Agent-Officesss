import { NextResponse } from "next/server";
import { toSafeError, type ErrorCode } from "./errors";

// Standard API result envelope shared by route handlers and server actions.
export type ApiResult<T> =
  | { success: true; data: T }
  | {
      success: false;
      error: {
        code: ErrorCode;
        message: string;
        fieldErrors?: Record<string, string[]>;
      };
    };

export function ok<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

export function fail(code: ErrorCode, message: string, fieldErrors?: Record<string, string[]>): ApiResult<never> {
  return { success: false, error: { code, message, fieldErrors } };
}

/** Wrap a route handler so thrown AppErrors become safe JSON responses. */
export function jsonResult<T>(data: T, status = 200) {
  return NextResponse.json<ApiResult<T>>({ success: true, data }, { status });
}

export function jsonError(err: unknown) {
  const safe = toSafeError(err);
  return NextResponse.json<ApiResult<never>>(
    { success: false, error: { code: safe.code, message: safe.message, fieldErrors: safe.fieldErrors } },
    { status: safe.status },
  );
}
