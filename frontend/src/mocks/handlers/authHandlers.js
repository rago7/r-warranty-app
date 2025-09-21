import { http, HttpResponse } from "msw";
import authFixture from "../fixtures/auth.json";


export const authHandlers = [
// POST /api/auth/login → accept any email with "@" and any password
    http.post("/api/auth/login", async ({ request }) => {
        try {
            const { email } = await request.json();
            if (!email || !email.includes("@")) {
                return HttpResponse.json({ message: "Invalid email" }, { status: 400 });
            }
            const access = "mock-access-" + Math.random().toString(36).slice(2);
            const refresh = "mock-refresh-" + Math.random().toString(36).slice(2);
            const user = { ...authFixture.user, email, name: email.split("@")[0] };
            return HttpResponse.json({ access, refresh, user }, { status: 200 });
        } catch (e) {
            return HttpResponse.json({ message: "Malformed request" }, { status: 400 });
        }
    }),


// GET /api/auth/me → return user if Authorization header present
    http.get("/api/auth/me", ({ request }) => {
        const auth = request.headers.get("authorization") || request.headers.get("Authorization");
        if (!auth || !auth.startsWith("Bearer ")) {
            return HttpResponse.json({ message: "Unauthorized" }, { status: 401 });
        }
        return HttpResponse.json({ user: authFixture.user }, { status: 200 });
    }),
];