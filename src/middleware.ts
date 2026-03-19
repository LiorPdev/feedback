import { clerkMiddleware } from "@clerk/nextjs/server";
 
export default clerkMiddleware();


export const config = {
    matcher: [
        '/((?!api|_next|[^?]*\\.(?:html?|css|js|json|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
    ],
};
