import Sidebar from "@/components/layout/Sidebar";
import StatCard from "@/components/dashboard/StatCard";
import PendingDocuments from "@/components/dashboard/PendingDocuments";

export default function DashboardPage() {
  return (
    <div className="bg-[#f8fafc] text-gray-900 min-h-screen flex">
      {/* Sidebar tetap di kiri */}
      <Sidebar />

      {/* Main Content di kanan (diberi margin-left 260px) */}
      <main className="flex-1 ml-[260px] min-w-0 flex flex-col">
        <div className="p-8 max-w-7xl mx-auto w-full flex flex-col gap-8">
          
          {/* Header Profil */}
          <section className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 tracking-tight">Halo, Ahmad Fauzan</h2>
              <p className="text-sm text-gray-500 mt-1">Berikut adalah ringkasan dokumen yang memerlukan perhatian Anda hari ini.</p>
            </div>
            <div className="flex items-center gap-4">
              <button className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:bg-gray-50 transition-colors relative shadow-sm">
                <span className="material-symbols-outlined text-[20px]">notifications</span>
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
              </button>
              <div className="w-11 h-11 rounded-full border border-gray-200 shadow-sm overflow-hidden shrink-0">
                <img 
                  src="https://lh3.googleusercontent.com/aida-public/AB6AXuCD26CHmUfdilXr5J8bA3XARQr1lS25IYnlFeshhdHDxu8e7Yj6DJPEQ4S9vO_taxMxf9CZZDxYa0p6U2tG5l0HLvPTjXN-DD7-zNa5fHelKLXxh602GC8gdoPE5lEkC_Gaha53kwjvtQoWjcn1smndDrzhjcin9LOSDF27UA8Bf1acyfpcGMHksxCMaKS4brNkRzR1gfwEIGr0b3TboDcxVs_PgRDCpvrrgA6vOA9hAzd5kBd2H6d7eA" 
                  alt="Profile"
                  className="w-full h-full object-cover" 
                />
              </div>
            </div>
          </section>

          {/* 3 Kotak Statistik */}
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard 
              title="Menunggu Tanda Tangan" 
              value="12" 
              icon="pending_actions" 
              badgeIcon="hourglass_top" 
              colorClass="text-amber-500" 
              bgBadgeClass="bg-amber-50" 
            />
            <StatCard 
              title="Ditandatangani (Hari Ini)" 
              value="5" 
              icon="draw" 
              badgeIcon="check_circle" 
              colorClass="text-emerald-500" 
              bgBadgeClass="bg-emerald-50" 
            />
            <StatCard 
              title="Total Dokumen Selesai" 
              value="1,284" 
              icon="inventory_2" 
              badgeIcon="folder_special" 
              colorClass="text-[#003b73]" 
              bgBadgeClass="bg-blue-50" 
            />
          </section>

          {/* Tabel Dokumen */}
          <PendingDocuments />

        </div>
      </main>
    </div>
  );
}