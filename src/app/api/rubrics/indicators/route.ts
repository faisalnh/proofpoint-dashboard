import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// POST /api/rubrics/indicators - Create new indicator
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { section_id, name, description, sort_order, evidence_guidance, score_options } = body;

        if (!section_id || !name) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newIndicator = await queryOne(
            `INSERT INTO rubric_indicators (section_id, name, description, sort_order, evidence_guidance, score_options)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING *`,
            [section_id, name, description, sort_order || 0, evidence_guidance, score_options ? JSON.stringify(score_options) : null]
        );

        return NextResponse.json({ data: newIndicator }, { status: 201 });
    } catch (error) {
        console.error("Create indicator error:", error);
        return NextResponse.json({ error: "Failed to create indicator" }, { status: 500 });
    }
}

// PATCH /api/rubrics/indicators - Update indicator
export async function PATCH(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await request.json();
        const { id, name, description, sort_order, evidence_guidance, score_options } = body;

        if (!id) {
            return NextResponse.json({ error: "Indicator ID is required" }, { status: 400 });
        }

        const updatedIndicator = await queryOne(
            `UPDATE rubric_indicators 
             SET name = COALESCE($1, name), 
                 description = COALESCE($2, description), 
                 sort_order = COALESCE($3, sort_order),
                 evidence_guidance = COALESCE($4, evidence_guidance),
                 score_options = COALESCE($5, score_options)
             WHERE id = $6
             RETURNING *`,
            [name, description, sort_order, evidence_guidance, score_options ? JSON.stringify(score_options) : null, id]
        );

        if (!updatedIndicator) {
            return NextResponse.json({ error: "Indicator not found" }, { status: 404 });
        }

        return NextResponse.json({ data: updatedIndicator });
    } catch (error) {
        console.error("Update indicator error:", error);
        return NextResponse.json({ error: "Failed to update indicator" }, { status: 500 });
    }
}

// DELETE /api/rubrics/indicators - Delete indicator
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Indicator ID is required" }, { status: 400 });
        }

        await query(`DELETE FROM rubric_indicators WHERE id = $1`, [id]);

        return NextResponse.json({ message: "Indicator deleted successfully" });
    } catch (error) {
        console.error("Delete indicator error:", error);
        return NextResponse.json({ error: "Failed to delete indicator" }, { status: 500 });
    }
}
