# Quill SQL Assistant

A full-stack **Next.js 14 + Postgres** playground that lets you:

- Run safe, read-only SQL queries against a Postgres database
- Chat with an AI assistant that generates SQL from natural language
- View query results in a clean, interactive table

Built with **Next.js (App Router)**, **Ant Design**, **Monaco Editor**, and **Dockerized Postgres**.

---

## 🚀 Getting Started

### 1. Install dependencies
```bash
npm install
# or
yarn install
```

### 2. Start Postgres (Docker)
This project includes a `docker-compose.yml` for Postgres.

```bash
docker-compose up -d
```

By default:
- **DB name**: `app`
- **User**: `app`
- **Password**: `app`
- **Port**: `5432`

Connect to the container:

```bash
docker exec -it quill-project-db-1 psql -U app -d app
```

### 3. Run Next.js
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000).

---

## 📂 Folder Structure

```
app/
 ├─ api/
 │   ├─ chat/          # AI → SQL generation endpoint
 │   ├─ schema/        # Returns DB schema as JSON
 │   ├─ sql/
 │   │   ├─ run/       # Executes validated SQL against Postgres
 │   │   └─ validate/  # Validates SQL (EXPLAIN only)
 │
 ├─ globals.css        # Global styles
 ├─ layout.tsx         # Root layout
 └─ page.tsx           # Main UI (SQL editor + chat)
```

---

## 🖥️ System Overview

### Server (Next.js API Routes)
- `/api/chat` → calls OpenAI, generates SQL from natural language
- `/api/schema` → fetches DB schema via Postgres `information_schema`
- `/api/sql/run` → validates + executes SQL queries safely
- `/api/sql/validate` → runs `EXPLAIN` to catch invalid queries

### Client (Next.js App Router)
- `page.tsx` → main UI with Monaco SQL editor, chat, results table
- Chat messages show **user queries** and **AI responses**
- AI-generated SQL can be **previewed, copied, or executed**

### Database (Postgres)
- Running in Docker
- Schema introspected via `information_schema`
- Queries validated before execution (no schema = no execution)

---

## 📦 Deployment

Deploy easily on [Vercel](https://vercel.com).  
Make sure Postgres is accessible and `DATABASE_URL` is set:

---

## 🔒 Safety & Validation

- AI-generated queries are validated with `EXPLAIN` before execution  
- Invalid or hallucinated fields/tables are rejected  
- End users never see broken SQL

---
