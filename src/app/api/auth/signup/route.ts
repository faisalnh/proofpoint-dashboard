import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import { query, queryOne } from "@/lib/db";

interface SignupBody {
  email: string;
  password: string;
  fullName?: string;
}

export async function POST(request: Request) {
  try {
    const body: SignupBody = await request.json();
    const { email, password, fullName } = body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    // Check if user already exists
    const existingUser = await queryOne<{ id: string }>(
      "SELECT id FROM users WHERE LOWER(email) = LOWER($1)",
      [normalizedEmail],
    );

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 },
      );
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const [newUser] = await query<{ id: string }>(
      "INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id",
      [normalizedEmail, passwordHash],
    );

    // Create profile
    await query(
      "INSERT INTO profiles (user_id, email, full_name) VALUES ($1, $2, $3)",
      [newUser.id, normalizedEmail, fullName ?? null],
    );

    // Assign default staff role
    await query("INSERT INTO user_roles (user_id, role) VALUES ($1, 'staff')", [
      newUser.id,
    ]);

    return NextResponse.json(
      { message: "User created successfully", userId: newUser.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Signup error:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 },
    );
  }
}
