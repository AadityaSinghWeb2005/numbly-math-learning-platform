import { NextRequest, NextResponse } from "next/server";
 
export async function middleware(request: NextRequest) {
	// Skip middleware - do client-side auth checks instead
	// (Bearer tokens in localStorage can't be accessed server-side)
	return NextResponse.next();
}
 
export const config = {
  runtime: "nodejs",
  matcher: ["/lessons", "/practice", "/dashboard"],
};