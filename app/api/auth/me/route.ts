import { NextResponse } from "next/server";
import { verifyAuthToken } from "@/lib/auth";

export async function GET(request: Request) {
    try {
        const cookieHeader = request.headers.get('cookie');
        if (!cookieHeader) return NextResponse.json({ success: false, error: "No session" }, { status: 401 });

        const cookies = Object.fromEntries(cookieHeader.split('; ').map(c => c.split('=')));
        const token = cookies['auth_token'];

        if (!token) return NextResponse.json({ success: false, error: "No session" }, { status: 401 });

        const user = verifyAuthToken(token);
        if (!user) return NextResponse.json({ success: false, error: "Invalid token" }, { status: 401 });

        return NextResponse.json({ success: true, user });
    } catch (error) {
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
