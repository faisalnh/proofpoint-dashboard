import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// GET /api/rubrics - List rubric templates with sections and indicators
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const templateId = searchParams.get("id");

        if (templateId) {
            // Get single template with sections and indicators
            const template = await queryOne(
                `SELECT * FROM rubric_templates WHERE id = $1`,
                [templateId]
            );

            if (!template) {
                return NextResponse.json({ error: "Template not found" }, { status: 404 });
            }

            const sections = await query(
                `SELECT * FROM rubric_sections WHERE template_id = $1 ORDER BY sort_order`,
                [templateId]
            );

            // Get indicators for each section
            const sectionsWithIndicators = await Promise.all(
                (sections as { id: string }[]).map(async (section) => {
                    const indicators = await query(
                        `SELECT * FROM rubric_indicators WHERE section_id = $1 ORDER BY sort_order`,
                        [section.id]
                    );
                    return { ...section, indicators };
                })
            );

            return NextResponse.json({
                data: { ...template, sections: sectionsWithIndicators }
            });
        }

        // List all templates
        const templates = await query(
            `SELECT rt.*, d.name as department_name, p.full_name as created_by_name
       FROM rubric_templates rt
       LEFT JOIN departments d ON rt.department_id = d.id
       LEFT JOIN profiles p ON rt.created_by = p.user_id
       ORDER BY rt.name`
        );

        return NextResponse.json({ data: templates });
    } catch (error) {
        console.error("Rubrics error:", error);
        return NextResponse.json({ error: "Failed to fetch rubrics" }, { status: 500 });
    }
}

// POST /api/rubrics - Create new rubric template
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { name, description, department_id, is_global } = body;

        const newTemplate = await queryOne(
            `INSERT INTO rubric_templates (name, description, department_id, is_global, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
            [name, description ?? null, department_id ?? null, is_global ?? false, session.user.id]
        );

        return NextResponse.json({ data: newTemplate }, { status: 201 });
    } catch (error) {
        console.error("Create rubric error:", error);
        return NextResponse.json({ error: "Failed to create rubric" }, { status: 500 });
    }
}
