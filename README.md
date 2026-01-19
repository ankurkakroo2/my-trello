# TicTac

> A clean, minimal task management board built with Next.js 15, React 19, and Drizzle ORM.

**Note:** This project exists primarily as a test case for the [Ralph Wiggum technique](https://github.com/anthropics/claude-code/tree/main/plugins/ralph-wiggum) — an iterative refinement approach for AI-assisted development.

## About Ralph Wiggum

The Ralph Wiggum technique involves giving Claude a single, comprehensive prompt with multiple interconnected requirements, then letting it iterate autonomously until completion. This repo demonstrates the results of that approach.

**The original prompt included:**
- Build a brutalist-themed Trello clone
- Implement drag-and-drop task management
- Add inline editing for all task properties
- Support tags and task status workflow
- Clean authentication flow
- Test all interactions via Playwright
- Eventually pivot to a cleaner, minimal theme
- Remove toast notifications in favor of self-expressive UI

**Outcome:** The technique worked well for this multi-component system. Requirements were handled systematically across the full stack — database schema, API routes, authentication, state management, and UI. The tradeoff was significant token consumption due to repeated iteration cycles.

## Tech Stack

- **Framework:** Next.js 15 (App Router)
- **UI:** React 19 with inline styles (no component library)
- **Database:** SQLite + Drizzle ORM
- **Auth:** NextAuth.js v5
- **Drag & Drop:** @dnd-kit
- **Testing:** Playwright

## Getting Started

```bash
npm install
npm run db:push    # Initialize database
npm run dev        # Start dev server on http://localhost:3000
```

## What This Demonstrates

When you give Claude a complex, multi-faceted problem with clear requirements, the Ralph Wiggum technique lets it:
- Break down the problem into manageable pieces
- Iterate until all requirements are satisfied
- Handle edge cases (inline editing, validation, error states)
- Adapt to mid-course changes (the theme pivot)

The token cost is real, but for complex systems where upfront planning is difficult, it's a useful approach.
