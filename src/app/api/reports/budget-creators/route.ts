import { db } from "@/utils/dbconfig";
import { budgets } from "@/utils/budget";
import { users } from "@/utils/userSchema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const budgetCreators = await db
      .selectDistinct({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .innerJoin(budgets, eq(users.id, budgets.ownerId))
      .orderBy(users.id);

    return NextResponse.json(budgetCreators);
  } catch (error: unknown) {
    console.error("Error fetching budget creators:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  }
}