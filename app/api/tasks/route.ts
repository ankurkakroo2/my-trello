import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, taskTags, tags } from "@/drizzle/schema";
import { eq, and, desc, asc } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const tagId = searchParams.get("tagId");
    const sortBy = searchParams.get("sortBy") || "order";

    let allTasks = await db.query.tasks.findMany({
      where: eq(tasks.userId, userId),
      with: {
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
      orderBy: [asc(tasks.order), desc(tasks.createdAt)],
    });

    // Apply filters
    let filteredTasks = allTasks;
    if (status && status !== "all") {
      filteredTasks = filteredTasks.filter((t) => t.status === status);
    }
    if (tagId) {
      filteredTasks = filteredTasks.filter((t) =>
        (t as any).taskTags?.some((tt: any) => tt.tagId === parseInt(tagId))
      );
    }

    // Apply sorting
    if (sortBy === "date") {
      filteredTasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }

    const result = filteredTasks.map((task) => ({
      id: task.id,
      title: task.title,
      description: task.description,
      status: task.status,
      order: task.order,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      tags: (task as any).taskTags?.map((tt: any) => ({
        id: tt.tag.id,
        name: tt.tag.name,
        color: tt.tag.color,
      })) || [],
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("Tasks GET error:", error);
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
    const { title, description, status, tags: tagsParam } = await req.json();

    if (!title || title.trim() === "") {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Get the max order for this status
    const maxOrderResult = await db
      .select({ order: tasks.order })
      .from(tasks)
      .where(and(eq(tasks.userId, userId), eq(tasks.status, status || "not_started")))
      .orderBy(desc(tasks.order))
      .limit(1);

    const nextOrder = maxOrderResult.length > 0 ? maxOrderResult[0].order + 1 : 0;

    const result = await db
      .insert(tasks)
      .values({
        userId,
        title: title.trim(),
        description: description?.trim() || null,
        status: status || "not_started",
        order: nextOrder,
      })
      .returning();

    // Handle tags
    if (tagsParam && Array.isArray(tagsParam) && tagsParam.length > 0) {
      for (const tagName of tagsParam) {
        if (typeof tagName !== "string" || tagName.trim() === "") continue;

        const trimmedName = tagName.trim();

        // Check if tag exists
        const existingTags = await db
          .select()
          .from(tags)
          .where(and(eq(tags.userId, userId), eq(tags.name, trimmedName)))
          .limit(1);

        let tagId: number;
        if (existingTags.length === 0) {
          // Create new tag with random color
          const colors = [
            "#FFDE59",
            "#4D96FF",
            "#FF6B9D",
            "#6BCB77",
            "#FF9F45",
            "#9B59B6",
          ];
          const randomColor = colors[Math.floor(Math.random() * colors.length)];

          const newTag = await db
            .insert(tags)
            .values({
              userId,
              name: trimmedName,
              color: randomColor,
            })
            .returning();

          tagId = newTag[0].id;
        } else {
          tagId = existingTags[0].id;
        }

        // Create task-tag relation
        await db.insert(taskTags).values({
          taskId: result[0].id,
          tagId,
        });
      }
    }

    // Fetch the created task with tags
    const createdTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, result[0].id),
      with: {
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        id: createdTask!.id,
        title: createdTask!.title,
        description: createdTask!.description,
        status: createdTask!.status,
        order: createdTask!.order,
        createdAt: createdTask!.createdAt,
        updatedAt: createdTask!.updatedAt,
        tags: (createdTask as any).taskTags?.map((tt: any) => ({
          id: tt.tag.id,
          name: tt.tag.name,
          color: tt.tag.color,
        })) || [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Tasks POST error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
