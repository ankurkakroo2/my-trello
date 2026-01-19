import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags, taskTags } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const tagId = parseInt((await params).id);
    const { name, color } = await req.json();

    // Check ownership
    const existingTag = await db.query.tags.findFirst({
      where: and(eq(tags.id, tagId), eq(tags.userId, userId)),
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (color !== undefined) updateData.color = color;

    const result = await db
      .update(tags)
      .set(updateData)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)))
      .returning();

    return NextResponse.json(result[0]);
  } catch (error) {
    console.error("Tag PATCH error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const tagId = parseInt((await params).id);

    // Check ownership
    const existingTag = await db.query.tags.findFirst({
      where: and(eq(tags.id, tagId), eq(tags.userId, userId)),
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete tag (cascade will handle task-tags)
    await db
      .delete(tags)
      .where(and(eq(tags.id, tagId), eq(tags.userId, userId)));

    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Tag DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
