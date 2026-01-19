# **Task Tracker Application - Requirements**

---

## **1. OVERVIEW**

Build a personal task management web app with Trello-style board interface. Single-user with authentication. Modern brutalist design - bold, big, fun, with balanced colors.

---

## **2. CORE FEATURES**

### **2.1 Task Data Model**
Each task has:
- Title (required)
- Description (optional)
- Status: Not Started | In Progress | Complete
- Tags (multiple, user-created)
- Creation timestamp

### **2.2 Views**

**Board View (Default)**
- Three columns for each status
- Drag tasks between columns to change status
- Drag within columns to reorder
- Click task to edit inline
- "+ Add Task" button in each column

**List View**
- Sortable table showing all tasks
- Columns: Title, Status, Tags, Created Date
- Click row to edit inline
- Toolbar: view toggle, grouping options, search, filters

**Grouping (Both Views)**
- Board: Always grouped by status (3 columns)
- List: Optional grouping by None, Status, or Tags

### **2.3 Task Management**
- Create: Add new task via column button
- Edit: Inline editing in both views - update title, description, tags, status
- Delete: With confirmation dialog
- Reorder: Drag to change priority within status

### **2.4 Tags**
- Auto-create when user types new tag name
- Display as colored pills
- Filter tasks by tags in list view
- Random color assignment on creation

---

## **3. AUTHENTICATION**

- Email + password sign up/sign in
- Use NextAuth.js v5 (Auth.js)
- Protected routes (redirect to sign-in if not authenticated)
- JWT sessions
- Single user per account (no sharing/collaboration)

---

## **4. TECHNICAL STACK**

**Frontend:**
- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS

**Database:**
- SQLite (local development)
- Drizzle ORM
- Docker for database hosting (initial iteration)

**Authentication:**
- NextAuth.js v5

---

## **5. DEVELOPMENT SETUP (FIRST ITERATION)**

**Local Environment:**
- Install Docker
- Run SQLite in Docker container for local development
- Use docker-compose for easy setup
- All testing happens locally
- No Turso/Vercel deployment in first iteration

**Database:**
- Local SQLite file or Dockerized SQLite
- Drizzle migrations for schema management
- Seed data script for testing

**Deployment (LATER):**
- Vercel hosting (future iteration)
- Turso migration (future iteration)
- Environment variables setup (future iteration)

---

## **6. DESIGN REQUIREMENTS**

**Style:** Modern brutalist
- Bold, thick borders
- Strong shadows (no blur, offset shadows)
- High contrast black/white base
- Vibrant accent colors for visual interest
- Large, generous spacing
- Sans-serif typography
- Playful micro-interactions (hover effects, drag animations)

**Accessibility:**
- Keyboard navigation for all actions
- ARIA labels for screen readers
- Sufficient color contrast
- Minimum 44px touch targets

---

## **7. PERFORMANCE TARGETS**

- Initial load: < 2s on 3G
- Drag operations: 60 FPS, instant visual feedback
- Optimistic updates: UI updates immediately, background persist
- Support up to 500 tasks without pagination
- JS bundle: < 150KB gzipped

---

## **8. KEY INTERACTIONS**

**Inline Editing:**
- Click any task in board or list view to enter edit mode
- Edit title, description, tags, status in-place
- Save on blur, Enter key, or explicit save action
- Cancel with Escape key
- No modals for editing

**Drag and Drop:**
- Smooth, responsive dragging at 60 FPS
- Visual feedback: drop zones highlight, dragged item has distinct style
- Cross-column drag changes status + moves to bottom of new column
- Within-column drag reorders tasks
- Optimistic updates with error revert

**Error Handling:**
- Form validation: inline error messages
- Network errors: toast notifications with retry option
- Failed optimistic updates: revert UI, show error toast

**State Management:**
- All mutations optimistic (UI updates before server confirms)
- Revert on failure with user notification
- Retry on network errors (up to 3 attempts)

---

## **9. OUT OF SCOPE (v1)**

- Multi-user collaboration
- Real-time sync
- Subtasks
- Due dates
- File attachments
- Calendar integration
- Mobile native apps (web-responsive only)
- Cloud deployment (Vercel/Turso - later iteration)

---

## **IMPLEMENTATION NOTES**

**Database Schema:**
- Users table (id, email, password_hash, created_at)
- Tasks table (id, user_id, title, description, status, order, created_at, updated_at)
- Tags table (id, user_id, name, color)
- Task-tags junction table

**API Design:**
- RESTful endpoints for CRUD operations
- Optimistic client-side updates
- Background persistence with error handling

**First Iteration Focus:**
- Get local development environment running with Docker
- Implement core CRUD operations
- Basic UI with inline editing
- Test thoroughly in local environment
- Defer deployment concerns to future iterations
