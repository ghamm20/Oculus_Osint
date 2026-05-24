import { NextResponse, type NextRequest } from "next/server";
import { validateStream } from "@/server/liveSources/streamValidator";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const sourceUrl = typeof body.source_url === "string" ? body.source_url : "";
    const validation = await validateStream(sourceUrl);
    return NextResponse.json({ validation });
}
