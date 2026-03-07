# Bank Statement Analysis Platform

## 1. Title
**Bank Statement Analysis Platform**

## 2. Description
Bank Statement Analysis Platform is a production-ready, backend-focused internship project for secure bank statement ingestion and financial analytics.

The platform supports statement uploads in CSV/PDF/image formats, extracts transactions using OCR and AI-assisted processing, and provides actionable insights through dashboard analytics.

It combines:
- A robust Node.js + Express API with JWT security, role-based authorization, rate limiting, and Swagger documentation
- A modern React frontend for upload, transaction management, and analytics visualization

### Repository Structure
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

## 3. Tech Stack
### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- bcrypt password hashing
- Swagger (`swagger-ui-express`, `swagger-jsdoc`)
- Redis (optional caching)

### Frontend
- React
- Vite
- Tailwind CSS
- Recharts
- Axios
- React Router

## 4. Features
- User registration and login
- JWT authentication
- Role-based access control (`user`, `admin`)
- Upload bank statements (`CSV`, `PDF`, `JPG`, `JPEG`, `PNG`)
- OCR parsing for scanned/image statements
- AI transaction extraction and AI-generated financial insights
- Transaction management (list, edit, delete, manual add)
- Financial analytics dashboard (summary, trends, category analysis)
- Budget tracking with alerts
- Dark/light mode
- Fully responsive UI
- Swagger API documentation (`/api-docs`)

## 5. Installation
### Clone the Repository
```bash
git clone https://github.com/your-username/bank-statement-analysis-platform.git
cd bank-statement-analysis-platform
```

### Install Dependencies
Backend dependencies (from project root):
```bash
npm install
```

Frontend dependencies:
```bash
cd client
npm install
cd ..
```

### Environment Variables
Create a `.env` file in the project root:
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

Optional frontend environment file (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:8000/api/v1
```

## 6. Run Backend
From the project root:
```bash
npm run dev
```

Backend service:
```text
http://localhost:8000
```

## 7. Run Frontend
From the `client` directory:
```bash
cd client
npm run dev
```

Frontend service:
```text
http://localhost:5173
```

## 8. API Documentation
Base API URL:
```text
http://localhost:8000/api/v1
```

### Authentication Endpoints
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

### Statement Endpoints
- `POST /statements`
- `POST /statements/upload`
- `POST /statements/manual`
- `GET /statements`
- `GET /statements/:id`
- `PATCH /statements/:id/transactions/:transactionIndex`
- `DELETE /statements/:id/transactions/:transactionIndex`
- `DELETE /statements/:id`

### Analysis Endpoints
- `GET /analysis/summary`
- `GET /analysis/ai-insights`

### Swagger UI
```text
http://localhost:8000/api-docs
```

## 9. Screenshots
### Dashboard
![Dashboard](screenshots/dashboard.png)

### Upload Statement
![Upload](screenshots/upload.png)

### Transactions
![Transactions](screenshots/transactions.png)

### Swagger API
![Swagger](screenshots/swagger.png)

## 10. Scalability Notes
- The backend is stateless (JWT-based), which supports horizontal scaling behind a load balancer.
- Redis integration is available for caching and can reduce repeated expensive reads/computations.
- API rate-limiting controls are configurable via environment variables.
- The service-controller-route separation supports modular extension for new domains and features.
- Current architecture can be extended with queue-based background processing for OCR/AI-heavy workloads.

## 11. Future Improvements
- Smart category auto-tagging with improved AI prompts
- Background processing queue for heavy statement files
- Real-time notifications and webhook integrations
- Multi-account aggregation (multiple banks)
- Export analytics reports (PDF/Excel)
- Team collaboration with org/workspace support

## 12. Author
**Your Name**

- GitHub: `https://github.com/your-username`
- LinkedIn: `https://linkedin.com/in/your-profile`
