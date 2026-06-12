# AI Agent Skills README

# 🖥️ Frontend Stack

Semua frontend wajib menggunakan teknologi berikut:

* React + Vite + JSX
* PWA (Progressive Web App)
* TailwindCSS
* Lucide React untuk icon
* Toast library untuk:

  * alert
  * confirm
  * success message
  * error message

---

# 🧹 Frontend Clean Code Rules

Frontend wajib menerapkan clean code:

* Struktur folder rapih
* Reusable components
* Reusable hooks
* Reusable utils
* Hindari duplicate code
* Pisahkan logic dan UI
* Gunakan naming yang konsisten
* Hindari hardcode endpoint
* Hindari file component terlalu panjang
* Component wajib mudah dibaca dan mudah maintenance

---

# 🌐 API Utils Rules

Wajib membuat folder utils/service khusus endpoint API agar route pemanggilan API lebih rapih dan terstruktur.

Contoh struktur:

```bash
src/
├── utils/
│   ├── api.js
│   ├── endpoints.js
│   └── request.js
```

Contoh `endpoints.js`:

```js
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
  },

  USERS: {
    LIST: "/users",
    DETAIL: (id) => `/users/${id}`,
  },
};
```

Contoh `api.js`:

```js
import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
});
```

Contoh penggunaan:

```js
import { api } from "@/utils/api";
import { API_ENDPOINTS } from "@/utils/endpoints";

await api.get(API_ENDPOINTS.USERS.LIST);
```

---

# 📱 Responsive Rules

Semua tampilan wajib:

* Responsive desktop
* Responsive tablet
* Responsive mobile
* Mobile friendly
* Admin panel mobile menu wajib:

  * collapse
  * toggle sidebar
  * smooth transition

---

# 📋 Admin Panel Rules

Semua admin panel wajib memiliki:

## Search Feature

* Search realtime
* Debounce search
* Debounce minimal 300ms

## Pagination

Pagination wajib dari API backend:

* default perpage: 10
* bisa memilih limit:

  * 10
  * 25
  * 50
  * 100

## Pagination Navigation

Wajib memiliki:

* Previous button
* Next button
* Pagination number
* Active page state

---

# 🪟 Form Rules

Semua form:

* Create wajib menggunakan Modal
* Edit wajib menggunakan Modal
* Delete wajib menggunakan Confirm Toast/Dialog
* Validation wajib ada
* Loading state wajib ada

---

# 🎨 UI/UX Rules

Wajib:

* Modern clean UI
* Consistent spacing
* Reusable components
* Responsive table
* Empty state
* Skeleton loading atau loading spinner
* Error state handling

---

# ⚙️ Backend Stack

Semua backend wajib menggunakan:

* Express JS
* MySQL
* REST API
* Folder frontend dan backend dipisah

---

# 📁 Backend Structure Rules

Backend wajib:

* Hanya menggunakan 1 file server utama
* Struktur clean dan simple
* Environment menggunakan `.env`

Contoh:

```bash
backend/
├── server.js
├── .env
├── uploads-project-name/
├── sql/
└── package.json
```

---

# 🗄️ Database Rules

Database wajib menggunakan:

* MySQL

Semua project wajib:

* Membuat file SQL export
* Membuat struktur tabel lengkap
* Include sample data jika diperlukan

Contoh:

```bash
sql/
└── database.sql
```

---

# 🌐 API Rules

Semua endpoint GET wajib support:

* Pagination
* Search
* Limit
* Sorting
* Filter

Contoh query:

```bash
/api/users?page=1&limit=10&search=john
```

Response wajib:

```json
{
  "success": true,
  "data": [],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "totalPages": 10
  }
}
```

---

# 🖼️ Upload Rules

Jika aplikasi membutuhkan upload gambar/file:

Wajib membuat folder:

```bash
uploads-[nama-project]
```

Contoh:

```bash
uploads-pos-app
uploads-ecommerce
uploads-company-profile
```

---

# 🔐 Security Rules

Wajib:

* Use dotenv
* Validation request
* Sanitize input
* Prevent SQL Injection
* Proper error handling
* CORS enabled
* Secure upload handling

---

# 📦 Recommended Libraries

## Frontend

```bash
react-router-dom
axios
lucide-react
react-hot-toast
tailwindcss
```

## Backend

```bash
express
mysql2
cors
dotenv
multer
nodemon
```

---

# 🧠 Coding Style Rules

* Clean code
* Reusable function
* Consistent naming
* Avoid duplicate code
* Simple architecture
* Easy maintenance
* Easy scaling

---

# 📌 Final Rules

AI wajib:

* Membuat project siap production
* Membuat code rapih
* Membuat responsive UI
* Membuat API lengkap
* Membuat SQL file
* Membuat upload folder jika diperlukan
* Membuat pagination dan search
* Menggunakan modal untuk create/edit
* Menggunakan toast untuk alert/confirm
* Menggunakan Lucide React icons
* Menggunakan TailwindCSS
* Menggunakan React Vite JSX PWA
* Menggunakan Express JS + MySQL
* Membuat API utils terpisah
* Membuat endpoint management yang rapih
* Menggunakan clean code architecture frontend

---

# ✅ Output Expectation

Hasil akhir wajib:

* Fullstack application
* Responsive
* Modern UI
* API ready
* Database ready
* Production ready
* Clean structure
* Easy deploy
* Easy maintenance

---

# 🧱 Project Baseline Requirements (Mandatory)

Aturan ini wajib dipenuhi oleh setiap project baru maupun project yang di-maintain:

1. **Wajib ada `.gitignore` di root project**:
   - Minimal ignore: `node_modules`, build outputs (`dist`, `build`), cache, logs, `.env`, IDE files.
   - Tidak boleh commit hasil build, dependency cache, atau secret lokal.

2. **Frontend wajib punya util endpoint API terpusat**:
   - Wajib ada file: `frontend/src/utils/endpoints.js`
   - Endpoint **tidak boleh hardcode** di komponen/page.
   - Semua route API dipanggil dari konstanta/fungsi di file endpoint tersebut.

3. **Frontend utils minimum**:
   - `frontend/src/utils/endpoints.js` -> daftar endpoint API.
   - `frontend/src/utils/api.js` -> konfigurasi axios/fetch instance.
   - `frontend/src/utils/request.js` -> helper request reusable.

4. **Standar isi awal `endpoints.js` (minimal)**:

```js
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    PROFILE: "/auth/profile",
  },
};
```

5. **Konvensi penggunaan**:
   - Import endpoint hanya dari `src/utils/endpoints.js`.
   - Hindari string endpoint langsung di service/component.
   - Semua tambahan endpoint baru wajib update file endpoint terpusat.
