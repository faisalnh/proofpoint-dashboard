import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// Helper to check if user is admin
function isAdmin(session: { user: { roles?: string[] } }) {
    const roles = (session.user as { roles?: string[] }).roles ?? [];
    return roles.includes("admin");
}

// GET /api/departments - List all departments
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const departments = await query(
            `SELECT d.*, p.name as parent_name,
                    (SELECT COUNT(*) FROM profiles WHERE department_id = d.id) as user_count
             FROM departments d
             LEFT JOIN departments p ON d.parent_id = p.id
             ORDER BY d.name`
        );

        return NextResponse.json({ data: departments });
    } catch (error) {
        console.error("Departments error:", error);
        return NextResponse.json({ error: "Failed to fetch departments" }, { status: 500 });
    }
}

// POST /api/departments - Create department (admin only)
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { name, parent_id } = body;

        const newDept = await queryOne(
            `INSERT INTO departments (name, parent_id) VALUES ($1, $2) RETURNING *`,
            [name, parent_id ?? null]
        );

        return NextResponse.json({ data: newDept }, { status: 201 });
    } catch (error) {
        console.error("Create department error:", error);
        return NextResponse.json({ error: "Failed to create department" }, { status: 500 });
    }
}

// PUT /api/departments - Update department (admin only)
export async function PUT(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await request.json();
        const { id, name, parent_id } = body;

        if (!id) {
            return NextResponse.json({ error: "Department ID required" }, { status: 400 });
        }

        // Prevent circular references
        if (parent_id === id) {
            return NextResponse.json({ error: "Cannot set department as its own parent" }, { status: 400 });
        }

        const updated = await queryOne(
            `UPDATE departments 
             SET name = COALESCE($1, name),
                 parent_id = $2,
                 updated_at = now()
             WHERE id = $3
             RETURNING *`,
            [name, parent_id ?? null, id]
        );

        if (!updated) {
            return NextResponse.json({ error: "Department not found" }, { status: 404 });
        }

        return NextResponse.json({ data: updated });
    } catch (error) {
        console.error("Update department error:", error);
        return NextResponse.json({ error: "Failed to update department" }, { status: 500 });
    }
}

// DELETE /api/departments - Delete department (admin only)
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!isAdmin(session)) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "Department ID required" }, { status: 400 });
        }

        // Check if department has users
        const userCount = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM profiles WHERE department_id = $1`,
            [id]
        );

        if (userCount && parseInt(userCount.count) > 0) {
            return NextResponse.json({
                error: "Cannot delete department with assigned users. Reassign users first."
            }, { status: 400 });
        }

        // Check if department has child departments
        const childCount = await queryOne<{ count: string }>(
            `SELECT COUNT(*) as count FROM departments WHERE parent_id = $1`,
            [id]
        );

        if (childCount && parseInt(childCount.count) > 0) {
            return NextResponse.json({
                error: "Cannot delete department with child departments. Delete children first."
            }, { status: 400 });
        }

        await query(`DELETE FROM departments WHERE id = $1`, [id]);
        return NextResponse.json({ message: "Department deleted" });
    } catch (error) {
        console.error("Delete department error:", error);
        return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
    }
}
