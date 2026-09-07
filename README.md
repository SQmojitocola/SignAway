Mantap! Karena modul **PDF Stamping Engine** sudah teruji dan kamu memilih menggunakan format gambar `![ERD](ERD.png)` untuk menampilkan diagram, berikut adalah berkas **`README.md`** versi final yang sudah diperbaiki, dirapikan format *bullet points*-nya, dan siap kamu salin ke proyek:

```markdown
# 🖊️ SignAway - Digital Signature Web App

Aplikasi Tanda Tangan Digital Multi-Recipient berbasis Web & Tablet (iPad) yang dibangun menggunakan Next.js App Router, Prisma ORM, dan PostgreSQL.

---

## 🛠️ Tech Stack

* **Framework:** Next.js (App Router) & TypeScript
* **Database & ORM:** PostgreSQL & Prisma ORM
* **Authentication:** Auth.js (NextAuth v5) & `bcryptjs`
* **PDF Processing Engine:** `pdf-lib`
* **Styling & UI:** Tailwind CSS & `shadcn/ui`

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

Akses aplikasi melalui browser di `http://localhost:3000`.

---

## 📡 Dokumentasi API Endpoints (Backend)

### **1. Autentikasi**

* **`POST /api/auth/register`**
* **Fungsi:** Mendaftarkan pengguna baru (Pengirim / Penandatangan).
* **Payload:** `{ "name": "Budi", "email": "budi@signaway.com", "password": "password123" }`


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
* **Payload:**
```json
{
  "documentId": "doc-uuid",
  "fields": [
    {
      "recipientId": "recipient-uuid",
      "pageNumber": 1,
      "posX": 100.5,
      "posY": 200.0,
      "width": 150,
      "height": 60
    }
  ]
}

```




* **`GET /api/documents/fields?documentId={ID}`**
* **Fungsi:** Mengambil data koordinat plot frame TTD dari dokumen tertentu.



### **4. PDF Stamping Engine**

* **`POST /api/documents/sign`**
* **Fungsi:** Membaca koordinat field, menempelkan gambar TTD (Base64 PNG) ke PDF fisik via `pdf-lib`, mengunci status recipient, dan mencatat *Signature Log* (Audit Trail).
* **Payload:** `{ "documentId": "doc-uuid", "signatureImageBase64": "data:image/png;base64,..." }`



---

## 🗄️ Skema Data & Alur Sistem

Sistem mendukung alur **Multi-Recipient** dengan struktur entitas:

1. **`User`** $\rightarrow$ Pengirim atau penandatangan.
2. **`Document`** $\rightarrow$ Menyimpan metadata file PDF dan status dokumen (*DRAFT*, *PENDING*, *PARTIAL_SIGNED*, *COMPLETED*, *REJECTED*).
3. **`DocumentRecipient`** $\rightarrow$ Daftar penandatangan beserta status (*WAITING*, *SIGNED*, *REJECTED*).
4. **`DocumentField`** $\rightarrow$ Koordinat titik frame TTD untuk tiap penandatangan.
5. **`SignatureLog`** $\rightarrow$ Bukti audit trail (IP Address, Timestamp, dan riwayat TTD).

```

---
