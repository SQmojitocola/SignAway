# 🖊️ SignAway - Digital Signature Web App

Aplikasi Tanda Tangan Digital Multi-Recipient berbasis Web & Tablet (iPad) yang dibangun menggunakan Next.js App Router, Prisma ORM, dan PostgreSQL.

---

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router) & TypeScript
* **Database & ORM:** PostgreSQL & Prisma ORM
* **Authentication:** Auth.js (NextAuth v5) & `bcryptjs`
* **PDF Processing Engine:** `pdf-lib`
* **Styling & UI:** Tailwind CSS, `shadcn/ui`, & Lucide Icons

---

## 🗄️ Entity Relationship Diagram (ERD)

<img src="ERD.png" width="400">

---

## 🚀 Cara Menjalankan Proyek (Development)

### 1. Clone Repository & Install Dependencies
```bash
git clone <url-repository-kamu>
cd SignAway
npm install

```

### 2. Konfigurasi Environment Variables (`.env`)

Buat berkas `.env` di direktori utama (*root*) proyek dan isi variabel berikut:

```env
DATABASE_URL="postgresql://postgres:password_kamu@localhost:5432/signaway_db?schema=public"
NEXTAUTH_SECRET="signaway-secret-key-super-aman"
NEXTAUTH_URL="http://localhost:3000"

```

### 3. Eksekusi Migrasi Database

Terapkan skema database ke PostgreSQL lokal:

```bash
npx prisma migrate dev
npx prisma generate

```

### 4. Jalankan Server Lokal

```bash
npm run dev

```

Akses aplikasi melalui browser di `http://localhost:3000` (akan di-redirect otomatis ke `/login`).

---

## 💻 Modul & Antarmuka Frontend (UI)

* **Modul Global Layout & Sidebar (`components/Sidebar.tsx` & `app/layout.tsx`)**
* Navigation bar terpusat yang menyesuaikan status menu aktif (*active state*) via `usePathname()`.
* Dikonfigurasi secara global di `layout.tsx` sehingga tidak memuat ulang (*re-render*) saat pengguna berpindah halaman.
* Otomatis tersembunyi pada halaman khusus (`/login`, `/register`, `/documents/[id]/edit`, dan `/upload/success`).


* **Modul Autentikasi (`/login` & `/register`)**
* **Login Page:** Akses masuk berbasis email/username dan peran (*Role Selector: Admin/Karyawan*).
* **Register Page:** Form pendaftaran pegawai dilengkapi NIP/ID Karyawan, konfirmasi password, serta perekaman awal **Spesimen Tanda Tangan Digital** via Interactive HTML5 Canvas.


* **Modul Upload Dokumen & Recipient Management (`/upload`)**
* **Dropzone Upload PDF:** Area unggah file PDF fisik (maks. 25MB) dengan pemrosesan konversi ke Base64.
* **Pencarian Kontak:** Pencarian data pengguna terdaftar via API internal (`/api/users`) berdasarkan email.
* **Manajemen Penerima (Recipients):** Pengelolaan daftar kontak (*Contact List*) dan alur penentuan penandatangan dokumen berurutan (*Multi-Recipient*).


* **Modul Document Field Plotting Editor (`/documents/[id]/edit`)**
* **Interactive Canvas Plotting:** Antarmuka pemetaan titik lokasi TTD secara dinamis pada lembar PDF.
* **Multi-Recipient Field Assignment:** Penentuan penandatangan (*recipient*) untuk setiap *box TTD* yang ditempatkan.
* **Field Property Inspector:** Panel pengaturan tipe kolom (*Tanda Tangan* / *Paraf*) dan pengelolaan penghapusan frame TTD.


* **Modul Konfirmasi Pengiriman (`/upload/success`)**
* **Status Summary:** Ringkasan status pengiriman dokumen, waktu pengiriman, metode penandatanganan, dan indikator status *Menunggu Tanda Tangan* tiap penerima.

---

## 🔄 Update Pengembangan Modul Terbaru

### Dashboard & Notifikasi Visual
* Menambahkan indikator dot merah di card dashboard untuk dokumen yang masih belum dibuka / belum diproses.
* Dot merah hanya aktif untuk dokumen yang benar-benar belum ditangani, bukan sekadar hitungan total dokumen.
* Jumlah angka pada card tetap stabil; indikator visual yang berubah hanya dot merah.
* Daftar tabel dashboard telah diperbarui dengan kolom `Penerima` yang menampilkan avatar/initial penerima dan tooltip nama saat hover.

### Upload & Draft Recovery
* Menambah validasi draft upload agar hanya file PDF yang valid dan memiliki nama yang benar yang dipulihkan dari browser.
* Draft kosong, file tidak valid, atau file tanpa nama akan dibersihkan otomatis agar halaman upload tidak menampilkan dokumen dummy.
* Setelah dokumen berhasil dikirim, draft lokal dihapus agar tidak memicu upload berulang saat pengguna kembali ke halaman upload.

### UI/UX Improvement
* Menghilangkan ikon notifikasi header yang tidak dibutuhkan.
* Menata badge dan red-dot agar lebih konsisten berada di sudut kanan atas card/tombol aksi.
* Mengurangi kebingungan visual pada halaman dashboard dan upload dengan penyederhanaan indikator.

---

## 📡 Dokumentasi API Endpoints (Backend)

### **1. Autentikasi**

* **`POST /api/auth/register`**
* **Fungsi:** Mendaftarkan pengguna baru (Pengirim / Penandatangan) beserta spesimen TTD.


* **`POST /api/auth/callback/credentials`**
* **Fungsi:** Endpoint login Auth.js berbasis email dan password.


* **`GET /api/auth/session`**
* **Fungsi:** Memeriksa sesi login pengguna yang sedang aktif.



### **2. Manajemen Dokumen & Upload**

* **`POST /api/documents/upload`**
* **Fungsi:** Mengunggah file PDF (Base64), menyimpan file ke `/public/uploads`, serta memetakan daftar penerima (*recipients*).
* **Payload:** `{ "title": "Dokumen A", "pdfBase64": "data:application/pdf;base64,...", "recipientIds": ["user-id-1", "user-id-2"] }`


* **`GET /api/documents/[id]`**
* **Fungsi:** Mengambil data metadata detail dokumen tertentu.



### **3. Document Field Plotting**

* **`POST /api/documents/fields`**
* **Fungsi:** Menyimpan koordinat frame TTD $(X, Y, \text{halaman}, \text{ukuran})$ hasil *drag-and-drop* pengirim.


* **`GET /api/documents/fields?documentId={ID}`**
* **Fungsi:** Mengambil data koordinat plot frame TTD dari dokumen tertentu.



### **4. PDF Stamping Engine**

* **`POST /api/documents/sign`**
* **Fungsi:** Membaca koordinat field, menempelkan gambar TTD (Base64 PNG) ke PDF fisik via `pdf-lib`, mengunci status recipient, dan mencatat *Signature Log* (Audit Trail).



---

## 🔍 Alat Bantu Pengujian & Manajemen Data

* **Prisma Studio:**
Untuk melihat dan memverifikasi data pendaftaran pengguna maupun dokumen secara langsung melalui antarmuka tabel web, jalankan perintah:
```bash
npx prisma studio

```


Akses antarmuka visual di `http://localhost:5555`.


* **Automation Scripts (`scripts/`):**
```bash
# Uji coba upload dokumen PDF
npx tsx scripts/test-upload.ts

# Uji coba simpan & ambil koordinat plotting field
npx tsx scripts/test-fields.ts

# Uji coba penempelan TTD fisik ke PDF (Stamping Engine)
npx tsx scripts/test-stamping.ts

```



```

```