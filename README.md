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

![ERD](ERD.png)

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

* **Modul Global Layout & Sidebar (`components/sidebar.tsx` & `app/layout.tsx`)**
* Navigation bar terpusat yang menyesuaikan status menu aktif (*active state*) via `usePathname()`.
* Dikonfigurasi secara global di `layout.tsx` sehingga tidak memuat ulang (*re-render*) saat pengguna berpindah halaman.
* Otomatis tersembunyi pada halaman autentikasi (`/login` & `/register`).


* **Modul Autentikasi (`/login` & `/register`)**
* **Login Page:** Akses masuk berbasis email/username dan peran (*Role Selector: Admin/Karyawan*).
* **Register Page:** Form pendaftaran pegawai dilengkapi NIP/ID Karyawan, konfirmasi password, serta perekaman awal **Spesimen Tanda Tangan Digital** via Interactive HTML5 Canvas.


* **Modul Upload Dokumen & Recipient Management (`/upload`)**
* **Dropzone Upload PDF:** Area unggah file PDF fisik (maks. 25MB) dengan pemrosesan konversi ke Base64.
* **Pencarian Kontak:** Pencarian data pengguna terdaftar via API internal berdasarkan email.
* **Manajemen Penerima (Recipients):** Pengelolaan daftar kontak (*Contact List*) dan alur penentuan penandatangan dokumen berurutan (*Multi-Recipient*).



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
