import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { tasks } from "@/drizzle/schema";
import { eq, and } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { updates } = await req.json();

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    // Update each task's order and status
    for (const update of updates) {
      const { id, status, order } = update;
      if (id === undefined || status === undefined || order === undefined) {
        continue;
      }

      // Verify ownership
      const existingTask = await db.query.tasks.findFirst({
        where: and(eq(tasks.id, id), eq(tasks.userId, userId)),
      });

      if (existingTask) {
        await db
          .update(tasks)
          .set({
            status,
            order,
            updatedAt: new Date(),
          })
          .where(eq(tasks.id, id));
      }
    }

    return NextResponse.json({ message: "Tasks reordered successfully" });
  } catch (error) {
    console.error("Tasks reorder error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
