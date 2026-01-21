import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// GET /api/work-tasks/subtasks - List subtasks for a task
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get("taskId");

        if (!taskId) {
            return NextResponse.json({ error: "taskId required" }, { status: 400 });
        }

        // Verify task ownership
        const task = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM work_tasks WHERE id = $1",
            [taskId]
        );

        if (!task || task.user_id !== session.user.id) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const subtasks = await query(
            `SELECT * FROM work_subtasks WHERE task_id = $1 ORDER BY sort_order, created_at`,
            [taskId]
        );

        return NextResponse.json({ data: subtasks });
    } catch (error) {
        console.error("Get subtasks error:", error);
        return NextResponse.json({ error: "Failed to fetch subtasks" }, { status: 500 });
    }
}

// POST /api/work-tasks/subtasks - Create subtask
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { task_id, title } = body;

        if (!task_id || !title) {
            return NextResponse.json({ error: "task_id and title required" }, { status: 400 });
        }

        // Verify task ownership
        const task = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM work_tasks WHERE id = $1",
            [task_id]
        );

        if (!task || task.user_id !== session.user.id) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Get max sort_order
        const maxOrder = await queryOne<{ max_order: number }>(
            `SELECT COALESCE(MAX(sort_order), 0) as max_order FROM work_subtasks WHERE task_id = $1`,
            [task_id]
        );

        const subtask = await queryOne(
            `INSERT INTO work_subtasks (task_id, title, sort_order)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [task_id, title, (maxOrder?.max_order || 0) + 1]
        );

        // Recalculate task progress
        await updateTaskProgress(task_id);

        return NextResponse.json({ data: subtask }, { status: 201 });
    } catch (error) {
        console.error("Create subtask error:", error);
        return NextResponse.json({ error: "Failed to create subtask" }, { status: 500 });
    }
}

// PUT /api/work-tasks/subtasks - Update subtask (toggle completion)
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, title, is_completed, sort_order } = body;

        if (!id) {
            return NextResponse.json({ error: "Subtask ID required" }, { status: 400 });
        }

        // Get subtask with task ownership check
        const subtask = await queryOne<{ task_id: string; task_user_id: string }>(
            `SELECT s.task_id, t.user_id as task_user_id 
             FROM work_subtasks s 
             JOIN work_tasks t ON s.task_id = t.id 
             WHERE s.id = $1`,
            [id]
        );

        if (!subtask || subtask.task_user_id !== session.user.id) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        const setClauses: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (title !== undefined) {
            setClauses.push(`title = $${paramIndex++}`);
            params.push(title);
        }

        if (is_completed !== undefined) {
            setClauses.push(`is_completed = $${paramIndex++}`);
            params.push(is_completed);
        }

        if (sort_order !== undefined) {
            setClauses.push(`sort_order = $${paramIndex++}`);
            params.push(sort_order);
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: "No fields to update" }, { status: 400 });
        }

        params.push(id);

        const updated = await queryOne(
            `UPDATE work_subtasks SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        // Recalculate task progress
        await updateTaskProgress(subtask.task_id);

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Update subtask error:", error);
        return NextResponse.json({ error: "Failed to update subtask" }, { status: 500 });
    }
}

// DELETE /api/work-tasks/subtasks - Delete subtask
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Subtask ID required" }, { status: 400 });
        }

        // Get subtask with task ownership check
        const subtask = await queryOne<{ task_id: string; task_user_id: string }>(
            `SELECT s.task_id, t.user_id as task_user_id 
             FROM work_subtasks s 
             JOIN work_tasks t ON s.task_id = t.id 
             WHERE s.id = $1`,
            [id]
        );

        if (!subtask || subtask.task_user_id !== session.user.id) {
            return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
        }

        await query("DELETE FROM work_subtasks WHERE id = $1", [id]);

        // Recalculate task progress
        await updateTaskProgress(subtask.task_id);

        return NextResponse.json({ message: "Subtask deleted" });
    } catch (error) {
        console.error("Delete subtask error:", error);
        return NextResponse.json({ error: "Failed to delete subtask" }, { status: 500 });
    }
}

// Helper: Update task progress based on subtasks completion
async function updateTaskProgress(taskId: string) {
    const stats = await queryOne<{ total: number; completed: number }>(
        `SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE is_completed = true) as completed
         FROM work_subtasks WHERE task_id = $1`,
        [taskId]
    );

    if (stats && stats.total > 0) {
        const progress = Math.round((stats.completed / stats.total) * 100);
        await query(
            `UPDATE work_tasks SET progress = $1, updated_at = now() WHERE id = $2`,
            [progress, taskId]
        );
    }
}
