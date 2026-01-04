/**
 * API Client for self-hosted backend
 * Provides a Supabase-like interface for easier migration
 */

type QueryParams = Record<string, string | number | boolean | null | undefined>;

interface ApiResponse<T> {
    data: T | null;
    error: Error | null;
}

class ApiClient {
    private baseUrl = "/api";

    private async request<T>(
        endpoint: string,
        options: RequestInit = {}
    ): Promise<ApiResponse<T>> {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`, {
                ...options,
                headers: {
                    "Content-Type": "application/json",
                    ...options.headers,
                },
            });

            const data = await response.json();

            if (!response.ok) {
                return { data: null, error: new Error(data.error || "Request failed") };
            }

            return { data: data.data ?? data, error: null };
        } catch (error) {
            return { data: null, error: error as Error };
        }
    }

    // Profiles
    async getProfiles(params?: QueryParams): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.set(key, String(value));
                }
            });
        }
        const query = searchParams.toString();
        return this.request(`/profiles${query ? `?${query}` : ""}`);
    }

    async getProfile(userId: string): Promise<ApiResponse<unknown>> {
        return this.request(`/profiles?userId=${userId}`);
    }

    async updateProfile(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/profiles", {
            method: "PUT",
            body: JSON.stringify(data),
        });
    }

    // Departments
    async getDepartments(): Promise<ApiResponse<unknown[]>> {
        return this.request("/departments");
    }

    async createDepartment(data: { name: string; parent_id?: string }): Promise<ApiResponse<unknown>> {
        return this.request("/departments", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    // Assessments
    async getAssessments(params?: QueryParams): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.set(key, String(value));
                }
            });
        }
        const query = searchParams.toString();
        return this.request(`/assessments${query ? `?${query}` : ""}`);
    }

    async getAssessment(id: string): Promise<ApiResponse<unknown>> {
        return this.request(`/assessments?id=${id}`);
    }

    async createAssessment(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/assessments", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async updateAssessment(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/assessments", {
            method: "PUT",
            body: JSON.stringify({ id, ...data }),
        });
    }

    // Rubrics
    async getRubrics(): Promise<ApiResponse<unknown[]>> {
        return this.request("/rubrics");
    }

    async getRubric(id: string): Promise<ApiResponse<unknown>> {
        return this.request(`/rubrics?id=${id}`);
    }

    async updateRubric(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/rubrics", {
            method: "PATCH",
            body: JSON.stringify({ id, ...data }),
        });
    }

    async deleteRubric(id: string): Promise<ApiResponse<unknown>> {
        return this.request(`/rubrics?id=${id}`, {
            method: "DELETE",
        });
    }

    // Rubric Sections
    async createSection(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/rubrics/sections", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async updateSection(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/rubrics/sections", {
            method: "PATCH",
            body: JSON.stringify({ id, ...data }),
        });
    }

    async deleteSection(id: string): Promise<ApiResponse<unknown>> {
        return this.request(`/rubrics/sections?id=${id}`, {
            method: "DELETE",
        });
    }

    // Rubric Indicators
    async createIndicator(data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/rubrics/indicators", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async updateIndicator(id: string, data: Record<string, unknown>): Promise<ApiResponse<unknown>> {
        return this.request("/rubrics/indicators", {
            method: "PATCH",
            body: JSON.stringify({ id, ...data }),
        });
    }

    async deleteIndicator(id: string): Promise<ApiResponse<unknown>> {
        return this.request(`/rubrics/indicators?id=${id}`, {
            method: "DELETE",
        });
    }

    // Questions
    async getQuestions(params?: QueryParams): Promise<ApiResponse<unknown[]>> {
        const searchParams = new URLSearchParams();
        if (params) {
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null) {
                    searchParams.set(key, String(value));
                }
            });
        }
        const query = searchParams.toString();
        return this.request(`/questions${query ? `?${query}` : ""}`);
    }

    async createQuestion(data: { assessment_id: string; indicator_id?: string; question: string }): Promise<ApiResponse<unknown>> {
        return this.request("/questions", {
            method: "POST",
            body: JSON.stringify(data),
        });
    }

    async answerQuestion(id: string, response: string, status?: string): Promise<ApiResponse<unknown>> {
        return this.request("/questions", {
            method: "PUT",
            body: JSON.stringify({ id, response, status }),
        });
    }

    // User Roles
    async getUserRoles(userId?: string): Promise<ApiResponse<unknown[]>> {
        const query = userId ? `?userId=${userId}` : "";
        return this.request(`/user-roles${query}`);
    }

    async assignRole(userId: string, role: string): Promise<ApiResponse<unknown>> {
        return this.request("/user-roles", {
            method: "POST",
            body: JSON.stringify({ user_id: userId, role }),
        });
    }

    async removeRole(userId: string, role: string): Promise<ApiResponse<unknown>> {
        return this.request(`/user-roles?userId=${userId}&role=${role}`, {
            method: "DELETE",
        });
    }
}

export const api = new ApiClient();
