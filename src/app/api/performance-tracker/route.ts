import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

interface PerformanceEntry {
    id: string;
    user_id: string;
    kpi_id: string;
    template_id: string;
    period: string;
    claimed_score: number;
    evidence_description: string;
    notes: string | null;
    entry_date: string;
    created_at: string;
    updated_at: string;
}

// GET /api/performance-tracker - List entries for current user
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const entryId = searchParams.get("id");
        const period = searchParams.get("period");
        const templateId = searchParams.get("templateId");
        const kpiId = searchParams.get("kpiId");

        // Get single entry with artifacts
        if (entryId) {
            const entry = await queryOne(
                `SELECT pe.*, 
                        k.name as kpi_name, 
                        k.rubric_1, k.rubric_2, k.rubric_3, k.rubric_4,
                        ks.name as standard_name,
                        kd.name as domain_name,
                        rt.name as template_name
                 FROM performance_entries pe
                 LEFT JOIN kpis k ON pe.kpi_id = k.id
                 LEFT JOIN kpi_standards ks ON k.standard_id = ks.id
                 LEFT JOIN kpi_domains kd ON ks.domain_id = kd.id
                 LEFT JOIN rubric_templates rt ON pe.template_id = rt.id
                 WHERE pe.id = $1 AND pe.user_id = $2`,
                [entryId, session.user.id]
            );

            if (!entry) {
                return NextResponse.json({ error: "Entry not found" }, { status: 404 });
            }

            // Get artifacts for this entry
            const artifacts = await query(
                `SELECT * FROM performance_artifacts WHERE entry_id = $1 ORDER BY uploaded_at DESC`,
                [entryId]
            );

            return NextResponse.json({ data: { ...entry, artifacts } });
        }

        // Build query for listing entries
        let sql = `
            SELECT pe.*, 
                   k.name as kpi_name,
                   ks.name as standard_name,
                   kd.name as domain_name,
                   rt.name as template_name,
                   (SELECT COUNT(*) FROM performance_artifacts WHERE entry_id = pe.id) as artifact_count
            FROM performance_entries pe
            LEFT JOIN kpis k ON pe.kpi_id = k.id
            LEFT JOIN kpi_standards ks ON k.standard_id = ks.id
            LEFT JOIN kpi_domains kd ON ks.domain_id = kd.id
            LEFT JOIN rubric_templates rt ON pe.template_id = rt.id
            WHERE pe.user_id = $1
        `;
        const params: unknown[] = [session.user.id];
        let paramIndex = 2;

        if (period) {
            sql += ` AND pe.period = $${paramIndex++}`;
            params.push(period);
        }

        if (templateId) {
            sql += ` AND pe.template_id = $${paramIndex++}`;
            params.push(templateId);
        }

        if (kpiId) {
            sql += ` AND pe.kpi_id = $${paramIndex++}`;
            params.push(kpiId);
        }

        sql += ` ORDER BY pe.entry_date DESC, pe.created_at DESC`;

        const entries = await query(sql, params);

        // Also get summary stats
        const stats = await queryOne<{
            total_entries: number;
            unique_kpis: number;
            avg_score: number;
        }>(
            `SELECT 
                COUNT(*) as total_entries,
                COUNT(DISTINCT kpi_id) as unique_kpis,
                ROUND(AVG(claimed_score)::numeric, 2) as avg_score
             FROM performance_entries 
             WHERE user_id = $1 
             ${period ? `AND period = $2` : ""}
             ${templateId ? `AND template_id = $${period ? "3" : "2"}` : ""}`,
            period && templateId
                ? [session.user.id, period, templateId]
                : period
                    ? [session.user.id, period]
                    : templateId
                        ? [session.user.id, templateId]
                        : [session.user.id]
        );

        return NextResponse.json({ data: entries, stats });
    } catch (error) {
        console.error("Performance tracker error:", error);
        return NextResponse.json({ error: "Failed to fetch entries" }, { status: 500 });
    }
}

// POST /api/performance-tracker - Create new entry
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { kpi_id, template_id, period, claimed_score, evidence_description, notes, entry_date } = body;

        if (!kpi_id || !template_id || !period || !claimed_score || !evidence_description) {
            return NextResponse.json(
                { error: "Missing required fields: kpi_id, template_id, period, claimed_score, evidence_description" },
                { status: 400 }
            );
        }

        if (claimed_score < 1 || claimed_score > 4) {
            return NextResponse.json({ error: "claimed_score must be between 1 and 4" }, { status: 400 });
        }

        const newEntry = await queryOne<PerformanceEntry>(
            `INSERT INTO performance_entries 
             (user_id, kpi_id, template_id, period, claimed_score, evidence_description, notes, entry_date)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
             RETURNING *`,
            [
                session.user.id,
                kpi_id,
                template_id,
                period,
                claimed_score,
                evidence_description,
                notes ?? null,
                entry_date ?? new Date().toISOString().split('T')[0]
            ]
        );

        return NextResponse.json({ data: newEntry }, { status: 201 });
    } catch (error) {
        console.error("Create entry error:", error);
        return NextResponse.json({ error: "Failed to create entry" }, { status: 500 });
    }
}

// PUT /api/performance-tracker - Update entry
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, claimed_score, evidence_description, notes, entry_date } = body;

        if (!id) {
            return NextResponse.json({ error: "Entry ID required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM performance_entries WHERE id = $1",
            [id]
        );

        if (!existing) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        if (existing.user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized to edit this entry" }, { status: 403 });
        }

        // Build dynamic update
        const setClauses: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        if (claimed_score !== undefined) {
            if (claimed_score < 1 || claimed_score > 4) {
                return NextResponse.json({ error: "claimed_score must be between 1 and 4" }, { status: 400 });
            }
            setClauses.push(`claimed_score = $${paramIndex++}`);
            params.push(claimed_score);
        }

        if (evidence_description !== undefined) {
            setClauses.push(`evidence_description = $${paramIndex++}`);
            params.push(evidence_description);
        }

        if (notes !== undefined) {
            setClauses.push(`notes = $${paramIndex++}`);
            params.push(notes);
        }

        if (entry_date !== undefined) {
            setClauses.push(`entry_date = $${paramIndex++}`);
            params.push(entry_date);
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        params.push(id);

        const updated = await queryOne<PerformanceEntry>(
            `UPDATE performance_entries SET ${setClauses.join(", ")}, updated_at = now() WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Update entry error:", error);
        return NextResponse.json({ error: "Failed to update entry" }, { status: 500 });
    }
}

// DELETE /api/performance-tracker - Delete entry (and cascade to artifacts)
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Entry ID required" }, { status: 400 });
        }

        // Verify ownership
        const existing = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM performance_entries WHERE id = $1",
            [id]
        );

        if (!existing) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        if (existing.user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized to delete this entry" }, { status: 403 });
        }

        // Note: Artifacts are cascade deleted by FK constraint
        // TODO: Also delete files from MinIO storage
        await query("DELETE FROM performance_entries WHERE id = $1", [id]);

        return NextResponse.json({ message: "Entry deleted successfully" });
    } catch (error) {
        console.error("Delete entry error:", error);
        return NextResponse.json({ error: "Failed to delete entry" }, { status: 500 });
    }
}
