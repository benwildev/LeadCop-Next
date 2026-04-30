import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/backend/session";
import { uploadToCloudinary } from "@/lib/backend/cloudinary";

export async function POST(req: NextRequest) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await uploadToCloudinary(buffer, {
      folder: "leadcop-avatars",
      resource_type: "image",
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to upload avatar" }, { status: 500 });
  }
}
