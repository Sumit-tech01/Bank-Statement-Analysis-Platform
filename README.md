# Bank Statement Analysis API

A scalable backend system for analyzing bank statements, built with Node.js, Express, and MongoDB.
The platform provides secure authentication, statement management, and financial analytics through REST APIs.

---

## Overview

This project demonstrates a production-ready backend architecture with authentication, role-based access, API documentation, and performance optimizations.

Users can:

- Register and log in securely
- Upload and manage bank statements
- Analyze financial data
- Access APIs through documented Swagger endpoints

---

## Tech Stack

### Backend

- Node.js
- Express.js
- MongoDB (Atlas)
- Mongoose

### Authentication

- JWT (JSON Web Token)
- bcrypt password hashing

### API Documentation

- Swagger (OpenAPI)

### Security

- Helmet
- Rate limiting
- CORS protection

### Performance

- Redis caching (optional)
- Pagination
- Database indexing
- Compression middleware

### Logging

- Morgan request logging

---

## Project Structure

```text
server
│
├── config
│   ├── database.js
│   ├── redis.js
│   └── swagger.js
│
├── controllers
├── middleware
├── models
├── routes
├── utils
└── server.js
```

---

## API Endpoints

### Authentication

- POST `/api/v1/auth/register`
- POST `/api/v1/auth/login`
- GET `/api/v1/auth/me`

### Statements

- POST `/api/v1/statements`
- GET `/api/v1/statements`
- GET `/api/v1/statements/:id`
- DELETE `/api/v1/statements/:id`

### Analysis

- GET `/api/v1/analysis/summary`

---

## API Documentation

Swagger UI is available at:

`http://localhost:8000/api-docs`

This interface allows interactive API testing.

---

## Installation

Clone the repository:

```bash
git clone https://github.com/yourusername/bank-statement-analysis-api.git
cd bank-statement-analysis-api
```

Install dependencies:

```bash
npm install
```

---

## Environment Variables

Create a `.env` file:

```env
PORT=8000
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
```

---

## Run the Server

Start development server:

```bash
npm run dev
```

Server will run at:

`http://localhost:8000`

---

## Health Check

Endpoint:

- GET `/health`

Example response:

```json
{
  "status": "OK",
  "service": "Bank Statement Analysis API",
  "timestamp": "2026-03-06T12:34:56.789Z"
}
```

---

## Security Features

- JWT authentication
- Password hashing with bcrypt
- API rate limiting
- Helmet security headers
- Input validation
- Protected routes

---

## Performance Optimizations

- MongoDB indexing
- Pagination for large datasets
- Redis caching (optional)
- Compression middleware

---

## Future Improvements

- Background job processing
- Transaction categorization using AI
- Real-time financial insights
- Full frontend dashboard

---

## Author

Your Name
# Bank-Statement-Analysis-Platform
