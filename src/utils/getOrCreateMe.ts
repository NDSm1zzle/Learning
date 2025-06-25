import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "./dbconfig";
import { users } from "./userSchema";
import { eq } from "drizzle-orm";
export async function getOrCreateMe() {
    const { userId: clerkId } = await auth();

    // If no clerkId is available, it means the user is not authenticated.
    if (!clerkId) {
        return null;
    }

    const clerkUser = await clerkClient.users.getUser(clerkId);

    const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
        // This is an edge case, but a user should have a primary email.
        console.error(`User with clerkId ${clerkId} does not have a primary email.`);
        return null;
    }

    const [userRecord] = await db
        .insert(users)
        .values({
            clerkId,
            email: primaryEmail,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
        })
        .onConflictDoUpdate({
            target: users.clerkId,
            set: {
                email: primaryEmail,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
            },
        })
        .returning();
    return userRecord;
}
