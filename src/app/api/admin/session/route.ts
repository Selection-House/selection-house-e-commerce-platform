import { NextResponse, type NextRequest } from "next/server";
import { isStaffRequest } from "@/lib/auth";
export async function GET(request: NextRequest) { return NextResponse.json({ authenticated: isStaffRequest(request) }); }
