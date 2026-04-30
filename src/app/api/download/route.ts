import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/backend/session";

export async function GET(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");
  const name = searchParams.get("name");

  if (!url) return NextResponse.json({ error: "Missing url" }, { status: 400 });

  if (!/^https:\/\/res\.cloudinary\.com\//i.test(url)) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) return NextResponse.json({ error: "Failed to fetch file" }, { status: 502 });

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const filename = name || "attachment";
    const safeName = filename.replace(/[^\w.\-]/g, "_");

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", `attachment; filename="${safeName}"`);
    
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) headers.set("Content-Length", contentLength);

    return new NextResponse(upstream.body, { headers });
  } catch {
    return NextResponse.json({ error: "Download failed" }, { status: 502 });
  }
}
