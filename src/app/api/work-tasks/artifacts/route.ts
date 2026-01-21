import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";

// POST /api/work-tasks/artifacts - Upload file or add link to task
export async function POST(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const contentType = request.headers.get("content-type") || "";

        // Handle link addition (JSON body)
        if (contentType.includes("application/json")) {
            const body = await request.json();
            const { task_id, link_url, link_title } = body;

            if (!task_id || !link_url) {
                return NextResponse.json(
                    { error: "task_id and link_url are required" },
                    { status: 400 }
                );
            }

            // Verify task ownership
            const task = await queryOne<{ user_id: string }>(
                "SELECT user_id FROM work_tasks WHERE id = $1",
                [task_id]
            );

            if (!task || task.user_id !== session.user.id) {
                return NextResponse.json({ error: "Task not found" }, { status: 404 });
            }

            const artifact = await queryOne(
                `INSERT INTO performance_artifacts 
                 (task_id, artifact_type, link_url, link_title)
                 VALUES ($1, 'link', $2, $3)
                 RETURNING *`,
                [task_id, link_url, link_title ?? null]
            );

            return NextResponse.json({ data: artifact }, { status: 201 });
        }

        // Handle file upload (multipart/form-data)
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const taskId = formData.get("task_id") as string | null;

        if (!file || !taskId) {
            return NextResponse.json(
                { error: "file and task_id are required" },
                { status: 400 }
            );
        }

        // Verify task ownership
        const task = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM work_tasks WHERE id = $1",
            [taskId]
        );

        if (!task || task.user_id !== session.user.id) {
            return NextResponse.json({ error: "Task not found" }, { status: 404 });
        }

        // Upload to MinIO
        const buffer = Buffer.from(await file.arrayBuffer());
        const { key, url } = await uploadFile(
            buffer,
            file.name,
            session.user.id,
            file.type
        );

        // Create artifact record
        const artifact = await queryOne(
            `INSERT INTO performance_artifacts 
             (task_id, artifact_type, file_name, file_key, file_url, file_type, file_size)
             VALUES ($1, 'file', $2, $3, $4, $5, $6)
             RETURNING *`,
            [taskId, file.name, key, url, file.type, file.size]
        );

        return NextResponse.json({ data: artifact }, { status: 201 });
    } catch (error) {
        console.error("Upload artifact error:", error);
        return NextResponse.json({ error: "Failed to upload artifact" }, { status: 500 });
    }
}

// GET /api/work-tasks/artifacts - List artifacts for a task
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

        const artifacts = await query(
            `SELECT * FROM performance_artifacts WHERE task_id = $1 ORDER BY uploaded_at DESC`,
            [taskId]
        );

        return NextResponse.json({ data: artifacts });
    } catch (error) {
        console.error("Get artifacts error:", error);
        return NextResponse.json({ error: "Failed to fetch artifacts" }, { status: 500 });
    }
}

// DELETE /api/work-tasks/artifacts - Remove artifact
export async function DELETE(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const artifactId = searchParams.get("id");

        if (!artifactId) {
            return NextResponse.json({ error: "Artifact ID required" }, { status: 400 });
        }

        // Get artifact with task ownership check
        const artifact = await queryOne<{
            artifact_type: string;
            file_key: string | null;
            task_user_id: string
        }>(
            `SELECT pa.artifact_type, pa.file_key, t.user_id as task_user_id
             FROM performance_artifacts pa
             JOIN work_tasks t ON pa.task_id = t.id
             WHERE pa.id = $1`,
            [artifactId]
        );

        if (!artifact || artifact.task_user_id !== session.user.id) {
            return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
        }

        // Delete file from MinIO if it's a file
        if (artifact.artifact_type === 'file' && artifact.file_key) {
            try {
                await deleteFile(artifact.file_key);
            } catch (storageError) {
                console.warn("Failed to delete file from storage:", storageError);
            }
        }

        await query("DELETE FROM performance_artifacts WHERE id = $1", [artifactId]);

        return NextResponse.json({ message: "Artifact deleted" });
    } catch (error) {
        console.error("Delete artifact error:", error);
        return NextResponse.json({ error: "Failed to delete artifact" }, { status: 500 });
    }
}
