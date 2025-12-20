import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if admin
    const adminUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (adminUser?.role !== "ADMIN" && adminUser?.role !== "OWNER") {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get email stats for last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [total, byType, byStatus, recentEmails] = await Promise.all([
      // Total emails
      prisma.emailLog.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
      }),
      // By type
      prisma.emailLog.groupBy({
        by: ["type"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      // By status
      prisma.emailLog.groupBy({
        by: ["status"],
        where: { createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      // Recent emails
      prisma.emailLog.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          email: true,
          type: true,
          subject: true,
          status: true,
          createdAt: true,
          errorMessage: true,
        },
      }),
    ]);

    return NextResponse.json({
      total,
      byType: Object.fromEntries(byType.map((t) => [t.type, t._count])),
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      recentEmails,
    });
  } catch (error) {
    console.error("[API] Email stats error:", error);
    return NextResponse.json(
      { error: "Failed to fetch email stats" },
      { status: 500 }
    );
  }
}
