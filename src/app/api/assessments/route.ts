import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// GET /api/assessments - List assessments based on user role
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const assessmentId = searchParams.get("id");
        const staffId = searchParams.get("staffId");
        const status = searchParams.get("status");

        // Get single assessment
        if (assessmentId) {
            const assessment = await queryOne(
                `SELECT a.*, 
                rt.name as template_name,
                sp.full_name as staff_name,
                mp.full_name as manager_name,
                dp.full_name as director_name
         FROM assessments a
         LEFT JOIN rubric_templates rt ON a.template_id = rt.id
         LEFT JOIN profiles sp ON a.staff_id = sp.user_id
         LEFT JOIN profiles mp ON a.manager_id = mp.user_id
         LEFT JOIN profiles dp ON a.director_id = dp.user_id
         WHERE a.id = $1`,
                [assessmentId]
            );
            return NextResponse.json({ data: assessment });
        }

        // Build query based on filters
        let sql = `
      SELECT a.*, 
             rt.name as template_name,
             sp.full_name as staff_name,
             mp.full_name as manager_name
      FROM assessments a
      LEFT JOIN rubric_templates rt ON a.template_id = rt.id
      LEFT JOIN profiles sp ON a.staff_id = sp.user_id
      LEFT JOIN profiles mp ON a.manager_id = mp.user_id
      WHERE 1=1
    `;
        const params: unknown[] = [];
        let paramIndex = 1;

        if (staffId) {
            sql += ` AND a.staff_id = $${paramIndex++}`;
            params.push(staffId);
        }

        if (status) {
            sql += ` AND a.status = $${paramIndex++}`;
            params.push(status);
        }

        sql += ` ORDER BY a.created_at DESC`;

        const assessments = await query(sql, params);
        return NextResponse.json({ data: assessments });
    } catch (error) {
        console.error("Assessments error:", error);
        return NextResponse.json({ error: "Failed to fetch assessments" }, { status: 500 });
    }
}

// POST /api/assessments - Create new assessment
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { template_id, period, manager_id, director_id } = body;

        const newAssessment = await queryOne(
            `INSERT INTO assessments (staff_id, template_id, period, manager_id, director_id, status)
       VALUES ($1, $2, $3, $4, $5, 'draft')
       RETURNING *`,
            [session.user.id, template_id, period, manager_id ?? null, director_id ?? null]
        );

        return NextResponse.json({ data: newAssessment }, { status: 201 });
    } catch (error) {
        console.error("Create assessment error:", error);
        return NextResponse.json({ error: "Failed to create assessment" }, { status: 500 });
    }
}

// PUT /api/assessments - Update assessment
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, ...updates } = body;

        if (!id) {
            return NextResponse.json({ error: "Assessment ID required" }, { status: 400 });
        }

        // Build dynamic update query
        const setClauses: string[] = [];
        const params: unknown[] = [];
        let paramIndex = 1;

        const allowedFields = [
            "staff_scores", "manager_scores", "staff_evidence", "manager_evidence",
            "manager_notes", "director_comments", "final_score", "final_grade",
            "status", "staff_submitted_at", "manager_reviewed_at", "director_approved_at"
        ];

        for (const [key, value] of Object.entries(updates)) {
            if (allowedFields.includes(key)) {
                setClauses.push(`${key} = $${paramIndex++}`);
                params.push(key.includes("scores") || key.includes("evidence") ? JSON.stringify(value) : value);
            }
        }

        if (setClauses.length === 0) {
            return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
        }

        setClauses.push("updated_at = now()");
        params.push(id);

        const updated = await queryOne(
            `UPDATE assessments SET ${setClauses.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
            params
        );

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Update assessment error:", error);
        return NextResponse.json({ error: "Failed to update assessment" }, { status: 500 });
    }
}
