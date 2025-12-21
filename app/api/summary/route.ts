import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { and, eq, gte, lte, isNull, sum, sql } from "drizzle-orm";

import db from "@/db";
import { transactions, accounts, categories } from "@/db/schema";
import type { SummaryResponse, ExpenseBreakdownItem, MonthToMonthItem } from "@/models";

export async function GET(req: Request) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return new NextResponse("Unauthorized", { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const from = searchParams.get("from") || undefined;
    const to = searchParams.get("to") || undefined;
    const accountId = searchParams.get("accountId") || undefined;

    const defaultTo = new Date();
    const defaultFrom = new Date(
      defaultTo.getFullYear(),
      defaultTo.getMonth() - 1,
      defaultTo.getDate(),
    );

    const fromDate = from ? new Date(from) : defaultFrom;
    const toDate = to ? new Date(to) : defaultTo;

    const base_where = and(
      eq(accounts.userId, userId),
      isNull(transactions.deletedAt),
      gte(transactions.date, fromDate),
      lte(transactions.date, toDate),
      accountId ? eq(transactions.accountId, accountId) : undefined,
    );

    const income_result = await db
      .select({
        total: sum(transactions.amount),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(base_where, eq(transactions.type, "credit")));

    const expense_result = await db
      .select({
        total: sum(transactions.amount),
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(and(base_where, eq(transactions.type, "debit")));

    const expense_by_category = await db
      .select({
        category: categories.name,
        debit: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'debit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        credit: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        total: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'debit' THEN ${transactions.amount}::numeric ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .where(base_where)
      .groupBy(categories.name);

    const twelve_months_ago = new Date();
    twelve_months_ago.setMonth(twelve_months_ago.getMonth() - 12);

    const month_to_month = await db
      .select({
        month: sql<string>`TO_CHAR(${transactions.date}, 'YYYY-MM')`,
        income: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'credit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
        expense: sql<string>`COALESCE(SUM(CASE WHEN ${transactions.type} = 'debit' THEN ${transactions.amount}::numeric ELSE 0 END), 0)`,
      })
      .from(transactions)
      .innerJoin(accounts, eq(transactions.accountId, accounts.id))
      .where(
        and(
          eq(accounts.userId, userId),
          isNull(transactions.deletedAt),
          gte(transactions.date, twelve_months_ago),
          accountId ? eq(transactions.accountId, accountId) : undefined,
        ),
      )
      .groupBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`)
      .orderBy(sql`TO_CHAR(${transactions.date}, 'YYYY-MM')`);

    const total_income = income_result[0]?.total ? parseFloat(String(income_result[0].total)) : 0;
    const total_expenses = expense_result[0]?.total ? parseFloat(String(expense_result[0].total)) : 0;
    const net_balance = total_income - total_expenses;

    const expense_breakdown: ExpenseBreakdownItem[] = expense_by_category.map((item) => ({
      category: item.category || "Uncategorized",
      value: item.total ? parseFloat(String(item.total)) : 0,
      debit: item.debit ? parseFloat(String(item.debit)) : 0,
      credit: item.credit ? parseFloat(String(item.credit)) : 0,
    }));

    const month_data: MonthToMonthItem[] = month_to_month.map((item) => ({
      month: item.month,
      income: parseFloat(item.income || "0"),
      expense: parseFloat(item.expense || "0"),
    }));

    const response: SummaryResponse = {
      data: {
        total_income,
        total_expenses,
        net_balance,
        expense_breakdown,
        month_to_month: month_data,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    const error_message = error instanceof Error ? error.message : String(error);
    return new NextResponse(`Internal Server Error: ${error_message}`, { status: 500 });
  }
}
