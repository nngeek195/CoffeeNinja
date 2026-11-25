# Customer Inquiry Management System

A small full-stack web app for tracking customer inquiries from initial capture through resolution. Built for the Coffee Ninja technical assessment[cite: 1, 2].

Staff can sign in, log new inquiries, search or filter existing ones, and move them through a forward-only lifecycle (`New` -> `In Progress` -> `Resolved`)[cite: 1, 2]. Access control, input validation, and concurrency checks are enforced on the backend[cite: 1, 2, 3].

## Stack

- **Frontend:** Next.js (App Router), React, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript, Zod, JWT, bcryptjs
- **Database:** PostgreSQL with Prisma ORM
- **Tests:** Vitest, Supertest, React Testing Library

## Prerequisites

- Node.js 18+
- PostgreSQL running locally

## Running Locally

### 1. Create the database

Create a local PostgreSQL database named `inquiry_db`:

```sql
CREATE DATABASE inquiry_db;