import { db } from "../lib/db";
import { users, tasks, tags, taskTags } from "../drizzle/schema";
import bcrypt from "bcryptjs";

async function seed() {
  console.log("🌱 Starting seed...");

  // Create a test user
  const hashedPassword = await bcrypt.hash("password123", 10);
  const testUser = await db
    .insert(users)
    .values({
      email: "test@example.com",
      passwordHash: hashedPassword,
    })
    .returning();

  const userId = testUser[0].id;
  console.log(`✅ Created test user: test@example.com (password: password123)`);

  // Create tags
  const tagColors = ["#FFDE59", "#4D96FF", "#FF6B9D", "#6BCB77", "#FF9F45", "#9B59B6"];
  const tagNames = ["Work", "Personal", "Urgent", "Bug", "Feature", "Design"];

  const createdTags = await db
    .insert(tags)
    .values(
      tagNames.map((name) => ({
        userId,
        name,
        color: tagColors[tagNames.indexOf(name)],
      }))
    )
    .returning();

  console.log(`✅ Created ${createdTags.length} tags`);

  // Create sample tasks
  const sampleTasks = [
    { title: "Welcome to My Trello!", description: "This is your new task tracker. Try dragging this card!", status: "not_started" as const, tags: ["Personal"] },
    { title: "Learn the basics", description: "Click on any task to edit it inline. Try changing the status or adding tags.", status: "in_progress" as const, tags: ["Work"] },
    { title: "Drag and drop", description: "Drag tasks between columns to change their status. You can also reorder within a column.", status: "not_started" as const, tags: [] },
    { title: "Set up your workspace", description: "Add your own tasks and organize them with tags. Tags are auto-created when you type them!", status: "complete" as const, tags: ["Work", "Design"] },
    { title: "Try list view", description: "Toggle to list view to see all tasks in a table format with grouping options.", status: "not_started" as const, tags: [] },
    { title: "Keyboard shortcuts", description: "Press Enter to save, Escape to cancel. Click outside the card to save on blur.", status: "in_progress" as const, tags: ["Personal"] },
    { title: "Fix navigation bug", description: "The menu doesn't close on mobile devices", status: "not_started" as const, tags: ["Bug", "Urgent"] },
    { title: "Design new landing page", description: "Create wireframes for the new product launch page", status: "in_progress" as const, tags: ["Design", "Feature"] },
    { title: "Update documentation", description: "Add API documentation for the new endpoints", status: "not_started" as const, tags: ["Work", "Feature"] },
    { title: "Code review", description: "Review pull requests from the team", status: "complete" as const, tags: ["Work"] },
    { title: "Database optimization", description: "Optimize slow queries identified in production logs", status: "not_started" as const, tags: ["Urgent", "Bug"] },
    { title: "User feedback session", description: "Schedule and conduct user testing for the new feature", status: "not_started" as const, tags: ["Design", "Personal"] },
  ];

  let order = 0;
  const statusOrder: Record<string, number> = { not_started: 0, in_progress: 0, complete: 0 };

  for (const taskData of sampleTasks) {
    const createdTask = await db
      .insert(tasks)
      .values({
        userId,
        title: taskData.title,
        description: taskData.description,
        status: taskData.status,
        order: statusOrder[taskData.status]++,
      })
      .returning();

    // Add tag associations
    for (const tagName of taskData.tags) {
      const tag = createdTags.find((t) => t.name === tagName);
      if (tag) {
        await db.insert(taskTags).values({
          taskId: createdTask[0].id,
          tagId: tag.id,
        });
      }
    }
  }

  console.log(`✅ Created ${sampleTasks.length} sample tasks`);
  console.log("\n🎉 Seed complete! You can now sign in with:");
  console.log("   Email: test@example.com");
  console.log("   Password: password123");
}

seed()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exit(1);
  });
