import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// GET /api/work-tasks/kpis - Get KPI links for a task
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

        return NextResponse.json({ data: kpis });
    } catch (error) {
        console.error("Get task KPIs error:", error);
        return NextResponse.json({ error: "Failed to fetch KPIs" }, { status: 500 });
    }
}

// POST /api/work-tasks/kpis - Link KPI to task
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { task_id, kpi_id, claimed_score, evidence_notes } = body;

        if (!task_id || !kpi_id) {
            return NextResponse.json({ error: "task_id and kpi_id required" }, { status: 400 });
        }

        // Verify task ownership
        const task = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM work_tasks WHERE id = $1",
            [task_id]
        );

        if (!task || task.user_id !== session.user.id) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        const link = await queryOne(
            `INSERT INTO work_task_kpis (task_id, kpi_id, claimed_score, evidence_notes)
             VALUES ($1, $2, $3, $4)
             ON CONFLICT (task_id, kpi_id) DO UPDATE SET 
                claimed_score = COALESCE($3, work_task_kpis.claimed_score),
                evidence_notes = COALESCE($4, work_task_kpis.evidence_notes)
             RETURNING *`,
            [task_id, kpi_id, claimed_score ?? null, evidence_notes ?? null]
        );

        return NextResponse.json({ data: link }, { status: 201 });
    } catch (error) {
        console.error("Link KPI error:", error);
        return NextResponse.json({ error: "Failed to link KPI" }, { status: 500 });
    }
}

// PUT /api/work-tasks/kpis - Update KPI link (claimed score, notes)
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, claimed_score, evidence_notes } = body;

        if (!id) {
            return NextResponse.json({ error: "Link ID required" }, { status: 400 });
        }

        // Verify ownership via task
        const link = await queryOne<{ task_user_id: string }>(
            `SELECT t.user_id as task_user_id 
             FROM work_task_kpis tk 
             JOIN work_tasks t ON tk.task_id = t.id 
             WHERE tk.id = $1`,
            [id]
        );

        if (!link || link.task_user_id !== session.user.id) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        const updated = await queryOne(
            `UPDATE work_task_kpis 
             SET claimed_score = $1, evidence_notes = $2
             WHERE id = $3 RETURNING *`,
            [claimed_score ?? null, evidence_notes ?? null, id]
        );

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Update KPI link error:", error);
        return NextResponse.json({ error: "Failed to update KPI link" }, { status: 500 });
    }
}

// DELETE /api/work-tasks/kpis - Unlink KPI from task
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Link ID required" }, { status: 400 });
        }

        // Verify ownership via task
        const link = await queryOne<{ task_user_id: string }>(
            `SELECT t.user_id as task_user_id 
             FROM work_task_kpis tk 
             JOIN work_tasks t ON tk.task_id = t.id 
             WHERE tk.id = $1`,
            [id]
        );

        if (!link || link.task_user_id !== session.user.id) {
            return NextResponse.json({ error: "Link not found" }, { status: 404 });
        }

        await query("DELETE FROM work_task_kpis WHERE id = $1", [id]);

        return NextResponse.json({ message: "KPI unlinked" });
    } catch (error) {
        console.error("Delete KPI link error:", error);
        return NextResponse.json({ error: "Failed to unlink KPI" }, { status: 500 });
    }
}
