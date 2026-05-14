import { NextRequest, NextResponse } from "next/server";
import { loginByEmail, setSessionCookie } from "@/lib/auth";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = schema.parse(body);

    const xff = req.headers.get("x-forwarded-for");
    const ipAddress = xff ? xff.split(",")[0]!.trim() : req.headers.get("x-real-ip");
    const userAgent = req.headers.get("user-agent");

    const result = await loginByEmail(email, password, { ipAddress, userAgent });
    if (!result) {
      return NextResponse.json(
        { error: "البريد أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    await setSessionCookie(result.token);

    return NextResponse.json({
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        role: result.user.role,
        avatarUrl: result.user.avatarUrl,
      },
    });
  } catch (err: any) {
    if (err.name === "ZodError") {
      return NextResponse.json({ error: err.errors }, { status: 400 });
    }
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
