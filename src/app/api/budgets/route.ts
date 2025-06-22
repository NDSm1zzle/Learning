import { db } from "@/utils/dbconfig";
import { budgets, budgetMembers } from "@/utils/budget";
import { transactions } from "@/utils/transaction";
import { getOrCreateMe } from "@/utils/getOrCreateMe";
import { eq, and, sql, desc } from "drizzle-orm";
import { NextResponse } from "next/server"; // Import NextResponse for better error handling
export const dynamic = "force-dynamic";

/**
 * GET /api/budgets
 * Fetches all budgets for the currently authenticated user.
 */
export async function GET() {
    const me = await getOrCreateMe();
    if (!me) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

  const rows = await db
    .select({
      id: budgets.id,
      name: budgets.name,
      // Convert from cents to dollars/euros for API response
      targetAmount: sql<number>`${budgets.targetAmount} / 100.0`.as("targetAmount"),
      spent: sql<number>`coalesce(sum(${transactions.amount}), 0) / 100.0`.as("spent"),
      // Count members by joining budgetMembers
      members: sql<number>`count(${budgetMembers.userId})`.as("members"),
    })
    .from(budgets)
    .leftJoin(budgetMembers, eq(budgetMembers.budgetId, budgets.id))
    .leftJoin(transactions, eq(transactions.budgetId, budgets.id))
    .where(
      // User must be a member of the budget to see it
      sql`${budgets.id} IN (SELECT budget_id FROM budget_members WHERE user_id = ${me.id})`,
    )
    .groupBy(budgets.id)
    .orderBy(desc(budgets.createdAt));

    return NextResponse.json(rows);
}

/**
 * POST /api/budgets
 * Creates a new budget for the currently authenticated user.
 */
export async function POST(req: Request) {
    try {
        const me = await getOrCreateMe();
        if (!me) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { name, target } = await req.json();

        // Input validation
        if (!name || typeof name !== 'string' || name.trim() === '') {
            return NextResponse.json({ error: "Budget name is required and must be a non-empty string." }, { status: 400 });
        }

        // Ensure target is a number and positive
        const targetAmountFloat = Number(target);
        if (isNaN(targetAmountFloat) || targetAmountFloat <= 0) {
            return NextResponse.json({ error: "Target amount is required and must be a positive number." }, { status: 400 });
        }

        // Convert target amount from dollars/euros to cents to store as an integer
        const targetAmountInCents = Math.round(targetAmountFloat * 100);

        // Create the budget and set the creator as the owner
        const [newBudget] = await db
            .insert(budgets)
            .values({ name: name.trim(), targetAmount: targetAmountInCents, ownerId: me.id })
            .returning();

        // Automatically add the owner as a member of the budget
        await db.insert(budgetMembers).values({
            budgetId: newBudget.id,
            userId: me.id,
            role: 'owner', // Assign 'owner' role to the creator
        }).execute();

        return NextResponse.json(newBudget, { status: 201 }); // 201 Created for successful resource creation
    } catch (error: any) {
        console.error("Error creating budget:", error);
        // Provide a generic error message to the client, avoid exposing internal details
        return NextResponse.json({ error: "Internal Server Error: Could not create budget.", details: error.message }, { status: 500 });
    }
}