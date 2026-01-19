import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks, taskTags, tags } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const taskId = parseInt((await params).id);

    const task = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
      with: {
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    return NextResponse.json({
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
    });
  } catch (error) {
    console.error("Task GET error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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
    const taskId = parseInt((await params).id);
    const { title, description, status, tags: tagsParam } = await req.json();

    // Check ownership
    const existingTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Update task
    const updateData: Record<string, unknown> = {};
    if (title !== undefined) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (status !== undefined) updateData.status = status;

    if (Object.keys(updateData).length > 0) {
      updateData.updatedAt = new Date();
      await db
        .update(tasks)
        .set(updateData)
        .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));
    }

    // Handle tags update
    if (tagsParam !== undefined) {
      // Delete existing task-tags
      await db
        .delete(taskTags)
        .where(eq(taskTags.taskId, taskId));

      // Add new tags
      if (Array.isArray(tagsParam) && tagsParam.length > 0) {
        for (const tagName of tagsParam) {
          if (typeof tagName !== "string" || tagName.trim() === "") continue;

          const trimmedName = tagName.trim();

          // Check if tag exists - use select instead of query
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
            taskId,
            tagId,
          });
        }
      }
    }

    // Fetch updated task
    const updatedTask = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
      with: {
        taskTags: {
          with: {
            tag: true,
          },
        },
      },
    });

    return NextResponse.json({
      id: updatedTask!.id,
      title: updatedTask!.title,
      description: updatedTask!.description,
      status: updatedTask!.status,
      order: updatedTask!.order,
      createdAt: updatedTask!.createdAt,
      updatedAt: updatedTask!.updatedAt,
      tags: (updatedTask as any).taskTags?.map((tt: any) => ({
        id: tt.tag.id,
        name: tt.tag.name,
        color: tt.tag.color,
      })) || [],
    });
  } catch (error) {
    console.error("Task PATCH error:", error);
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
    const taskId = parseInt((await params).id);

    // Check ownership
    const existingTask = await db.query.tasks.findFirst({
      where: and(eq(tasks.id, taskId), eq(tasks.userId, userId)),
    });

    if (!existingTask) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    // Delete task (cascade will handle task-tags)
    await db
      .delete(tasks)
      .where(and(eq(tasks.id, taskId), eq(tasks.userId, userId)));

    return NextResponse.json({ message: "Task deleted successfully" });
  } catch (error) {
    console.error("Task DELETE error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
