import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { query, queryOne } from "@/lib/db";
import { uploadFile, deleteFile } from "@/lib/storage";

interface Artifact {
    id: string;
    entry_id: string;
    artifact_type: 'file' | 'link';
    file_name: string | null;
    file_key: string | null;
    file_url: string | null;
    file_type: string | null;
    file_size: number | null;
    link_url: string | null;
    link_title: string | null;
    uploaded_at: string;
}

// POST /api/performance-tracker/artifacts - Upload file or add link
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
            const { entry_id, link_url, link_title } = body;

            if (!entry_id || !link_url) {
                return NextResponse.json(
                    { error: "entry_id and link_url are required" },
                    { status: 400 }
                );
            }

            // Verify user owns the entry
            const entry = await queryOne<{ user_id: string }>(
                "SELECT user_id FROM performance_entries WHERE id = $1",
                [entry_id]
            );

            if (!entry) {
                return NextResponse.json({ error: "Entry not found" }, { status: 404 });
            }

            if (entry.user_id !== session.user.id) {
                return NextResponse.json({ error: "Not authorized" }, { status: 403 });
            }

            const artifact = await queryOne<Artifact>(
                `INSERT INTO performance_artifacts 
                 (entry_id, artifact_type, link_url, link_title)
                 VALUES ($1, 'link', $2, $3)
                 RETURNING *`,
                [entry_id, link_url, link_title ?? null]
            );

            return NextResponse.json({ data: artifact }, { status: 201 });
        }

        // Handle file upload (multipart/form-data)
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const entryId = formData.get("entry_id") as string | null;

        if (!file || !entryId) {
            return NextResponse.json(
                { error: "file and entry_id are required" },
                { status: 400 }
            );
        }

        // Verify user owns the entry
        const entry = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM performance_entries WHERE id = $1",
            [entryId]
        );

        if (!entry) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        if (entry.user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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
        const artifact = await queryOne<Artifact>(
            `INSERT INTO performance_artifacts 
             (entry_id, artifact_type, file_name, file_key, file_url, file_type, file_size)
             VALUES ($1, 'file', $2, $3, $4, $5, $6)
             RETURNING *`,
            [entryId, file.name, key, url, file.type, file.size]
        );

        return NextResponse.json({ data: artifact }, { status: 201 });
    } catch (error) {
        console.error("Upload artifact error:", error);
        return NextResponse.json({ error: "Failed to upload artifact" }, { status: 500 });
    }
}

// DELETE /api/performance-tracker/artifacts - Remove artifact
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

        // Get artifact with entry info
        const artifact = await queryOne<Artifact & { entry_user_id: string }>(
            `SELECT pa.*, pe.user_id as entry_user_id
             FROM performance_artifacts pa
             JOIN performance_entries pe ON pa.entry_id = pe.id
             WHERE pa.id = $1`,
            [artifactId]
        );

        if (!artifact) {
            return NextResponse.json({ error: "Artifact not found" }, { status: 404 });
        }

        if (artifact.entry_user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        // Delete file from MinIO if it's a file
        if (artifact.artifact_type === 'file' && artifact.file_key) {
            try {
                await deleteFile(artifact.file_key);
            } catch (storageError) {
                console.warn("Failed to delete file from storage:", storageError);
                // Continue with database deletion anyway
            }
        }

        await query("DELETE FROM performance_artifacts WHERE id = $1", [artifactId]);

        return NextResponse.json({ message: "Artifact deleted successfully" });
    } catch (error) {
        console.error("Delete artifact error:", error);
        return NextResponse.json({ error: "Failed to delete artifact" }, { status: 500 });
    }
}

// GET /api/performance-tracker/artifacts - List artifacts for an entry
export async function GET(request: Request) {
    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const entryId = searchParams.get("entryId");

        if (!entryId) {
            return NextResponse.json({ error: "entryId is required" }, { status: 400 });
        }

        // Verify user owns the entry
        const entry = await queryOne<{ user_id: string }>(
            "SELECT user_id FROM performance_entries WHERE id = $1",
            [entryId]
        );

        if (!entry) {
            return NextResponse.json({ error: "Entry not found" }, { status: 404 });
        }

        if (entry.user_id !== session.user.id) {
            return NextResponse.json({ error: "Not authorized" }, { status: 403 });
        }

        const artifacts = await query(
            `SELECT * FROM performance_artifacts WHERE entry_id = $1 ORDER BY uploaded_at DESC`,
            [entryId]
        );

        return NextResponse.json({ data: artifacts });
    } catch (error) {
        console.error("Get artifacts error:", error);
        return NextResponse.json({ error: "Failed to fetch artifacts" }, { status: 500 });
    }
}
