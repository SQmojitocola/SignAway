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
    select: { id: true, name: true, email: true, role: true },
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
      sender: { select: { id: true, name: true, email: true } },
      recipients: {
        select: {
          id: true,
          status: true,
          signingOrder: true,
          user: { select: { id: true, name: true, email: true } },
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
    <main className="min-w-0 flex flex-col w-full">
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-6">
        <PageHeaderBanner
          title={`Halo, ${user.name}`}
          subtitle="Ringkasan dokumen yang memerlukan perhatian dan tindakan tanda tangan Anda."
          action={
            <div className="w-11 h-11 rounded-full border border-white/20 shadow-sm bg-white/10 text-white flex items-center justify-center font-bold text-sm shrink-0">
              {getInitials(user.name)}
            </div>
          }
        />

        <PendingDocuments documents={dashboardDocuments} userId={user.id} />
      </div>
    </main>
  );
}