import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

interface WorkTask {
    id: string;
    user_id: string;
    template_id: string | null;
    period: string;
    title: string;
    description: string | null;
    status: 'planned' | 'in_progress' | 'completed';
    priority: 'low' | 'medium' | 'high' | 'urgent';
    progress: number;
    due_date: string | null;
    completed_at: string | null;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

// GET /api/work-tasks - List tasks with optional filters
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const taskId = searchParams.get("id");
        const period = searchParams.get("period");
        const templateId = searchParams.get("templateId");
        const status = searchParams.get("status");
        const kpiId = searchParams.get("kpiId");

        // Get single task with full details
        if (taskId) {
            const task = await queryOne(
                `SELECT t.*, 
                        rt.name as template_name,
                        (SELECT COUNT(*) FROM work_subtasks WHERE task_id = t.id) as subtask_count,
                        (SELECT COUNT(*) FROM work_subtasks WHERE task_id = t.id AND is_completed = true) as completed_subtask_count,
                        (SELECT COUNT(*) FROM work_task_kpis WHERE task_id = t.id) as kpi_count,
                        (SELECT COUNT(*) FROM performance_artifacts WHERE task_id = t.id) as artifact_count
                 FROM work_tasks t
                 LEFT JOIN rubric_templates rt ON t.template_id = rt.id
                 WHERE t.id = $1 AND t.user_id = $2`,
                [taskId, session.user.id]
            );

            if (!task) {
                return NextResponse.json({ error: "Task not found" }, { status: 404 });
            }

            // Get subtasks
            const subtasks = await query(
                `SELECT * FROM work_subtasks WHERE task_id = $1 ORDER BY sort_order, created_at`,
                [taskId]
            );

            // Get linked KPIs with details
            const kpis = await query(
                `SELECT tk.*, k.name as kpi_name, k.description as kpi_description,
                        k.rubric_1, k.rubric_2, k.rubric_3, k.rubric_4,
                        ks.name as standard_name, kd.name as domain_name
                 FROM work_task_kpis tk
                 JOIN kpis k ON tk.kpi_id = k.id
                 JOIN kpi_standards ks ON k.standard_id = ks.id
                 JOIN kpi_domains kd ON ks.domain_id = kd.id
                 WHERE tk.task_id = $1`,
                [taskId]
            );

            // Get artifacts
            const artifacts = await query(
                `SELECT * FROM performance_artifacts WHERE task_id = $1 ORDER BY uploaded_at DESC`,
                [taskId]
            );

            return NextResponse.json({
                data: { ...task, subtasks, kpis, artifacts }
            });
        }

        // Build query for listing tasks
        let sql = `
            SELECT t.*, 
                   rt.name as template_name,
                   (SELECT COUNT(*) FROM work_subtasks WHERE task_id = t.id) as subtask_count,
                   (SELECT COUNT(*) FROM work_subtasks WHERE task_id = t.id AND is_completed = true) as completed_subtask_count,
                   (SELECT COUNT(*) FROM work_task_kpis WHERE task_id = t.id) as kpi_count,
                   (SELECT COUNT(*) FROM performance_artifacts WHERE task_id = t.id) as artifact_count,
                   (SELECT json_agg(json_build_object('kpi_id', tk.kpi_id, 'kpi_name', k.name, 'domain_name', kd.name))
                    FROM work_task_kpis tk 
                    JOIN kpis k ON tk.kpi_id = k.id 
                    JOIN kpi_standards ks ON k.standard_id = ks.id
                    JOIN kpi_domains kd ON ks.domain_id = kd.id
                    WHERE tk.task_id = t.id) as kpi_names
            FROM work_tasks t
            LEFT JOIN rubric_templates rt ON t.template_id = rt.id
            WHERE t.user_id = $1
        `;
        const params: unknown[] = [session.user.id];
        let paramIndex = 2;

        if (period) {
            sql += ` AND t.period = $${paramIndex++}`;
            params.push(period);
        }

        if (templateId) {
            sql += ` AND t.template_id = $${paramIndex++}`;
            params.push(templateId);
        }

        if (status) {
            sql += ` AND t.status = $${paramIndex++}`;
            params.push(status);
        }

        if (kpiId) {
            sql += ` AND EXISTS (SELECT 1 FROM work_task_kpis WHERE task_id = t.id AND kpi_id = $${paramIndex++})`;
            params.push(kpiId);
        }

        sql += ` ORDER BY 
                    CASE t.status 
                        WHEN 'in_progress' THEN 1 
                        WHEN 'planned' THEN 2 
                        WHEN 'completed' THEN 3 
                    END,
                    t.sort_order, 
                    t.created_at DESC`;

        const tasks = await query(sql, params);

        // Get summary stats
        const stats = await queryOne<{
            total_tasks: number;
            planned_count: number;
            in_progress_count: number;
            completed_count: number;
            total_kpi_links: number;
        }>(
            `SELECT 
                COUNT(*) as total_tasks,
                COUNT(*) FILTER (WHERE status = 'planned') as planned_count,
                COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress_count,
                COUNT(*) FILTER (WHERE status = 'completed') as completed_count,
                (SELECT COUNT(*) FROM work_task_kpis tk JOIN work_tasks t ON tk.task_id = t.id WHERE t.user_id = $1 ${period ? 'AND t.period = $2' : ''}) as total_kpi_links
             FROM work_tasks 
             WHERE user_id = $1 ${period ? 'AND period = $2' : ''}`,
            period ? [session.user.id, period] : [session.user.id]
        );

        // Build KPI-to-tasks mapping for KPI view
        let kpiTasksMap: Record<string, string[]> = {};
        if (templateId) {
            const kpiLinks = await query(
                `SELECT tk.kpi_id, t.id as task_id
                 FROM work_task_kpis tk
                 JOIN work_tasks t ON tk.task_id = t.id
                 WHERE t.user_id = $1 AND t.template_id = $2 ${period ? 'AND t.period = $3' : ''}`,
                period ? [session.user.id, templateId, period] : [session.user.id, templateId]
            );

            kpiLinks.forEach((link: { kpi_id: string; task_id: string }) => {
                if (!kpiTasksMap[link.kpi_id]) {
                    kpiTasksMap[link.kpi_id] = [];
                }
                kpiTasksMap[link.kpi_id].push(link.task_id);
            });
        }

        return NextResponse.json({ data: tasks, stats, kpiTasksMap });
    } catch (error) {
        console.error("Work tasks error:", error);
        return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
    }
}

// POST /api/work-tasks - Create new task
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { template_id, period, title, description, status, priority, due_date, kpi_ids } = body;

        if (!period || !title) {
            return NextResponse.json(
                { error: "period and title are required" },
                { status: 400 }
            );
        }

        // Get max sort_order for this status
        const maxOrder = await queryOne<{ max_order: number }>(
            `SELECT COALESCE(MAX(sort_order), 0) as max_order 
             FROM work_tasks 
             WHERE user_id = $1 AND period = $2 AND status = $3`,
            [session.user.id, period, status || 'planned']
        );

        const newTask = await queryOne<WorkTask>(
            `INSERT INTO work_tasks 
             (user_id, template_id, period, title, description, status, priority, due_date, sort_order)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
             RETURNING *`,
            [
                session.user.id,
                template_id ?? null,
                period,
                title,
                description ?? null,
                status || 'planned',
                priority || 'medium',
                due_date ?? null,
                (maxOrder?.max_order || 0) + 1
            ]
        );

        // Link KPIs if provided
        if (kpi_ids && Array.isArray(kpi_ids) && kpi_ids.length > 0 && newTask) {
            for (const kpiId of kpi_ids) {
                await query(
                    `INSERT INTO work_task_kpis (task_id, kpi_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
                    [newTask.id, kpiId]
                );
            }
        }

        return NextResponse.json({ data: newTask }, { status: 201 });
    } catch (error) {
        console.error("Create task error:", error);
        return NextResponse.json({ error: "Failed to create task" }, { status: 500 });
    }
}

// PUT /api/work-tasks - Update task
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await queryOne<{ user_id: string; status: string }>(
            "SELECT user_id, status FROM work_tasks WHERE id = $1",
            [id]
        );

        if (!existing) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        if (existing.user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // Build dynamic update
        const setClauses: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        const allowedFields = ['title', 'description', 'status', 'priority', 'progress', 'due_date', 'sort_order'];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = $${paramIndex++}`);
                params.push(value);
            }
        }

        // Auto-set completed_at when status changes to completed
        if (updates.status === 'completed' && existing.status !== 'completed') {
            setClauses.push(`completed_at = now()`);
        } else if (updates.status && updates.status !== 'completed') {
            setClauses.push(`completed_at = NULL`);
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        params.push(id);

        const updated = await queryOne<WorkTask>(
            `UPDATE work_tasks SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Update task error:", error);
        return NextResponse.json({ error: "Failed to update task" }, { status: 500 });
    }
}

// PATCH /api/work-tasks - Batch update (for drag-drop reordering)
export async function PATCH(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { updates } = body; // Array of { id, status, sort_order }

        if (!Array.isArray(updates)) {
            return NextResponse.json({ error: "updates array required" }, { status: 400 });
        }

        for (const update of updates) {
            if (!update.id) continue;

            // Verify ownership
            const existing = await queryOne<{ user_id: string }>(
                "SELECT user_id FROM work_tasks WHERE id = $1",
                [update.id]
            );

            if (existing?.user_id !== session.user.id) continue;

            const setClauses: string[] = [];
            const params: unknown[] = [];
            let paramIndex = 1;

            if (update.status) {
                setClauses.push(`status = $${paramIndex++}`);
                params.push(update.status);

                if (update.status === 'completed') {
                    setClauses.push(`completed_at = now()`);
                } else {
                    setClauses.push(`completed_at = NULL`);
                }
            }

            if (typeof update.sort_order === 'number') {
                setClauses.push(`sort_order = $${paramIndex++}`);
                params.push(update.sort_order);
            }

            if (setClauses.length > 0) {
                params.push(update.id);
                await query(
                    `UPDATE work_tasks SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${paramIndex}`,
                    params
                );
            }
        }

        return NextResponse.json({ message: "Tasks updated" });
    } catch (error) {
        console.error("Batch update error:", error);
        return NextResponse.json({ error: "Failed to update tasks" }, { status: 500 });
    }
}

// DELETE /api/work-tasks - Delete task
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Task ID required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM work_tasks WHERE id = $1",
            [id]
        );

        if (!existing) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        if (existing.user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // Cascade delete handles subtasks, kpis, artifacts
        await query("DELETE FROM work_tasks WHERE id = $1", [id]);

        return NextResponse.json({ message: "Task deleted successfully" });
    } catch (error) {
        console.error("Delete task error:", error);
        return NextResponse.json({ error: "Failed to delete task" }, { status: 500 });
    }
}
