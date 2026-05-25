"use server";

import { signIn } from "@/lib/auth";
import { AuthError } from "next-auth";

interface LoginResult {
    success: boolean;
    error?: string;
}

// Phase 5 removed the conditional Supabase GoTrue branch. Local edition
// is the only operational path; cloud edition (if enabled by env) also
// uses the local credentials provider from src/lib/auth.ts.
export async function loginAction(formData: FormData): Promise<LoginResult> {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    try {
        await signIn("credentials", {
            email,
            password,
            redirect: false,
        });
        return { success: true };
    } catch (error) {
        if (error instanceof AuthError) {
            return {
                success: false,
                error: error.type === "CredentialsSignin"
                    ? "Invalid email or password."
                    : "Something went wrong.",
            };
        }
        throw error;
    }
}
