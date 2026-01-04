import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";

// GET /api/departments - List all departments
export async function GET() {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const departments = await query(
            `SELECT d.*, p.name as parent_name
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

        // Check if user is admin
        const roles = (session.user as { roles?: string[] }).roles ?? [];
        if (!roles.includes("admin")) {
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
