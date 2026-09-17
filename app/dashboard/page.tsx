import { redirect } from "next/navigation";
import PendingDocuments, { type DashboardDocument } from "@/components/dashboard/PendingDocuments";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

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
      <div className="max-w-7xl mx-auto w-full flex flex-col gap-8">
        <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Halo, {user.name}</h2>
            <p className="text-sm text-gray-500 mt-1">Berikut adalah ringkasan dokumen yang memerlukan perhatian Anda hari ini.</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-full border border-gray-200 shadow-sm bg-[#003b73] text-white flex items-center justify-center font-bold text-sm shrink-0">
              {getInitials(user.name)}
            </div>
          </div>
        </section>

        <PendingDocuments documents={dashboardDocuments} userId={user.id} />
      </div>
    </main>
  );
}