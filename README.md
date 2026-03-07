# 🏦 Bank Statement Analysis Platform

A production-ready full-stack fintech application for uploading bank statements, extracting transactions, and generating financial insights through analytics and AI-assisted processing.

## 📖 Description

**Bank Statement Analysis Platform** helps users securely upload statements in multiple formats (CSV, PDF, images), parse transactions using OCR and AI-assisted extraction, and monitor spending behavior through an interactive dashboard.

It includes a modern React frontend and a robust Node.js + Express backend with JWT-based security, role-based access, Swagger API docs, caching, and analytics endpoints.

## ✨ Features

- User registration and login
- JWT authentication
- Role-based access control (`user`, `admin`)
- Upload bank statements (`CSV`, `PDF`, `JPG`, `JPEG`, `PNG`)
- OCR parsing for scanned/image statements
- AI transaction extraction and AI financial insights
- Transaction management (list, edit, delete, manual add)
- Financial analytics dashboard (summary, trends, category analysis)
- Budget tracking with alerts
- Dark / light mode
- Fully responsive UI
- Swagger API documentation (`/api-docs`)

## 🧰 Tech Stack

### Frontend

- React
- Vite
- Tailwind CSS
- Recharts
- Axios
- React Router

### Backend

- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing
- Swagger (`swagger-ui-express`, `swagger-jsdoc`)
- Redis (optional caching)

## 📁 Project Structure

```bash
.
├── client/                  # React + Vite frontend
│   ├── src/
│   ├── package.json
│   └── .env.example
├── server/                  # Express backend
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── services/
│   ├── utils/
│   └── server.js
├── uploads/                 # Uploaded statement files
└── README.md
```

## ⚙️ Installation Steps

### 1. Clone repository

```bash
git clone https://github.com/your-username/bank-statement-analysis-platform.git
cd bank-statement-analysis-platform
```

### 2. Install backend dependencies (root)

```bash
npm install
```

### 3. Install frontend dependencies

```bash
cd client
npm install
cd ..
```

### 4. Configure environment variables

Create `.env` in project root and add required values (see next section).

### 5. Run backend (Terminal 1)

```bash
npm run dev
```

Backend runs at:

```text
http://localhost:8000
```

### 6. Run frontend (Terminal 2)

```bash
cd client
npm run dev
```

Frontend runs at:

```text
http://localhost:5173
```

## 🔐 Environment Variables

### Root `.env`

```env
NODE_ENV=development
PORT=8000
MONGODB_URI=mongodb://localhost:27017/bank-analysis
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
REDIS_URL=redis://localhost:6379
GEMINI_API_KEY=your_gemini_api_key
CORS_ORIGIN=http://localhost:5173
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=100
RATE_LIMIT_MAX_DEV=1000
```

### Frontend `client/.env` (optional)

```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 🌐 API Endpoints

Base URL:

```text
http://localhost:8000/api/v1
```

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Statements

- `POST /statements`
- `POST /statements/upload`
- `POST /statements/manual`
- `GET /statements`
- `GET /statements/:id`
- `PATCH /statements/:id/transactions/:transactionIndex`
- `DELETE /statements/:id/transactions/:transactionIndex`
- `DELETE /statements/:id`

### Analysis

- `GET /analysis/summary`
- `GET /analysis/ai-insights`

### Swagger Docs

```text
http://localhost:8000/api-docs
```

## 🖼️ Screenshots

Add your screenshots in the `screenshots/` folder and update paths below.

```md
![Login](screenshots/login.png)
![Dashboard](screenshots/dashboard.png)
![Transactions](screenshots/transactions.png)
![Analytics](screenshots/analytics.png)
![Upload](screenshots/upload.png)
```

## 🚀 Future Improvements

- Smart category auto-tagging with improved AI prompts
- Background processing queue for heavy statement files
- Real-time notifications and webhook integrations
- Multi-account aggregation (multiple banks)
- Export analytics reports (PDF/Excel)
- Team collaboration with org/workspace support

## 👨‍💻 Author

**Your Name**

- GitHub: `https://github.com/your-username`
- LinkedIn: `https://linkedin.com/in/your-profile`

## Screenshots

### Login Page
![Login](screenshots/login.png)

### Dashboard
![Dashboard](screenshots/dashboard.png)

### Upload Statement
![Upload](screenshots/upload.png)

### Swagger API
![Swagger](screenshots/swagger.png)
