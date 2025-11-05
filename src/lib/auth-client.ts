"use client"
import { createAuthClient } from "better-auth/react"

export const authClient = createAuthClient({
   baseURL: typeof window !== 'undefined' ? window.location.origin : process.env.NEXT_PUBLIC_SITE_URL,
   fetchOptions: {
      onSuccess: (ctx) => {
         const authToken = ctx.response.headers.get("set-authorization")
         if (authToken) {
            localStorage.setItem("bearer_token", authToken.replace("Bearer ", ""));
         }
      },
      onRequest: (ctx) => {
         const token = localStorage.getItem("bearer_token");
         if (token) {
            ctx.headers.set("Authorization", `Bearer ${token}`);
         }
      },
   },
});

export const useSession = authClient.useSession;