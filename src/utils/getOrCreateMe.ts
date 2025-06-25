// Import auth and clerkClient from Clerk's Next.js server utilities
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "./dbconfig";
import { users } from "./userSchema";
import { eq } from "drizzle-orm";

/**
 * Retrieves the current user from the Clerk session, then finds or creates a
 * corresponding user record in the local database. This "upsert" logic
 * ensures that every authenticated user has a local profile and that their
 * profile information is kept in sync with their Clerk account.
 *
 * @returns The user object from the database, or null if no user is authenticated.
 */
export async function getOrCreateMe() {
    const { userId: clerkId } = await auth();

    // If no clerkId is available, it means the user is not authenticated.
    if (!clerkId) {
        return null;
    }

    // Fetch the full user object from Clerk to get up-to-date details.
    const clerkUser = await clerkClient.users.getUser(clerkId);

    // Determine the user's primary email address.
    const primaryEmail = clerkUser.emailAddresses.find(
        (e) => e.id === clerkUser.primaryEmailAddressId
    )?.emailAddress;

    if (!primaryEmail) {
        // This is an edge case, but a user should have a primary email.
        console.error(`User with clerkId ${clerkId} does not have a primary email.`);
        return null;
    }

    // Perform an "upsert": If a user with the clerkId exists, update their details.
    // Otherwise, insert a new user record. This is more efficient than a separate SELECT and INSERT.
    const [userRecord] = await db
        .insert(users)
        .values({
            clerkId,
            email: primaryEmail,
            firstName: clerkUser.firstName,
            lastName: clerkUser.lastName,
        })
        .onConflictDoUpdate({
            target: users.clerkId, // The unique constraint to check against.
            set: {
                // Fields to update if the user already exists.
                email: primaryEmail,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
            },
        })
        .returning(); // Return the inserted or updated record.

    return userRecord;
}
