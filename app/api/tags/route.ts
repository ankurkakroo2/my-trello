import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tags, taskTags, tasks } from "@/drizzle/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const allTags = await db.query.tags.findMany({
      where: eq(tags.userId, userId),
      orderBy: desc(tags.id),
    });

    // Get task count for each tag
    const tagsWithCounts = await Promise.all(
      allTags.map(async (tag) => {
        const count = await db
          .select({ count: sql<number>`count(*)` })
          .from(taskTags)
          .where(eq(taskTags.tagId, tag.id));

        return {
          id: tag.id,
          name: tag.name,
          color: tag.color,
          taskCount: count[0]?.count || 0,
        };
      })
    );

    return NextResponse.json(tagsWithCounts);
  } catch (error) {
    console.error("Tags GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { name, color } = await req.json();

    if (!name || name.trim() === "") {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check if tag already exists
    const existingTag = await db.query.tags.findFirst({
      where: and(eq(tags.userId, userId), eq(tags.name, name.trim())),
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "Tag already exists" },
        { status: 409 }
      );
    }

    const result = await db
      .insert(tags)
      .values({
        userId,
        name: name.trim(),
        color: color || "#FFDE59",
      })
      .returning();

    return NextResponse.json(result[0], { status: 201 });
  } catch (error) {
    console.error("Tags POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
