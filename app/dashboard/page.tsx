import Link from "next/link";
import { redirect } from "next/navigation";
import PendingDocuments, { type DashboardDocument } from "@/components/dashboard/PendingDocuments";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

import PageHeaderBanner from "@/components/PageHeaderBanner";

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "U";
}

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  // 1. Ambil data user beserta Role-nya dari database
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true, role: true, avatarUrl: true },
  });

  if (!user) {
    redirect("/login");
  }

  // 📍 2. JIKA ADMIN -> LANGSUNG DIALIHKAN KE HALAMAN DASHBOARD ADMIN
  if (user.role === "ADMIN") {
    redirect("/admin/dashboard");
  }

  // 3. JIKA KARYAWAN BIASA -> LANJUT TAMPILKAN DASHBOARD DOKUMEN
  const documents = await prisma.document.findMany({
    where: {
      OR: [
        { senderId: user.id },
        { recipients: { some: { userId: user.id } } },
      ],
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      createdAt: true,
      status: true,
      sequential: true,
      sender: { select: { id: true, name: true, email: true, avatarUrl: true } },
      recipients: {
        select: {
          id: true,
          status: true,
          signingOrder: true,
          user: { select: { id: true, name: true, email: true, avatarUrl: true } },
        },
      },
    },
  });

  const dashboardDocuments: DashboardDocument[] = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    createdAt: doc.createdAt,
    status: doc.status,
    sequential: doc.sequential,
    sender: doc.sender,
    recipients: doc.recipients,
  }));

  return (
    <div className="min-w-0 flex flex-col w-full">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        <PageHeaderBanner
          title={`Halo, ${user.name}`}
          subtitle="Ringkasan dokumen yang memerlukan perhatian dan tindakan tanda tangan Anda."
          action={
            <Link
              href="/setting"
              title="Buka Pengaturan Profil"
              className="relative group block shrink-0"
            >
              <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] rounded-full border-2 border-white/40 shadow-lg bg-[#00284d] text-white flex items-center justify-center font-bold text-lg sm:text-xl shrink-0 overflow-hidden ring-4 ring-white/10 transition-transform duration-200 group-hover:scale-105">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(user.name)
                )}
              </div>
            </Link>
          }
        />

        <PendingDocuments documents={dashboardDocuments} userId={user.id} />
      </div>
    </div>
  );
}