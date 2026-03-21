# Blog Backend Scaffold

A lightweight backend scaffold for blog post CRUD.

## Tech Stack

- Node.js (ESM)
- Express
- Local JSON file persistence (`data/posts.json`)

## Quick Start

```bash
cd backend
npm install
npm run dev
```

Default server URL: `http://localhost:4000`

## API Base

`/api`

## Endpoints

- `GET /api/health`
- `GET /api/posts`
- `GET /api/posts/:id`
- `POST /api/posts`
- `PUT /api/posts/:id`
- `PATCH /api/posts/:id`
- `DELETE /api/posts/:id`

## Post Schema

```json
{
  "id": "uuid",
  "slug": "post-title",
  "title": "string",
  "excerpt": "string",
  "content": "string",
  "tags": ["string"],
  "status": "draft | published",
  "createdAt": "ISO timestamp",
  "updatedAt": "ISO timestamp",
  "publishedAt": "ISO timestamp | null"
}
```

## List Query Params

- `page` (default `1`)
- `pageSize` (default `10`, max `100`)
- `search` (fuzzy match title/excerpt/content)
- `tag` (exact tag match, case-insensitive)
- `status` (`draft` or `published`)
- `sortBy` (`createdAt` | `updatedAt` | `title`)
- `order` (`asc` | `desc`)

## Sample Create Payload

```json
{
  "title": "My first post",
  "excerpt": "Short summary",
  "content": "Full markdown or rich text content",
  "tags": ["frontend", "react"],
  "status": "draft"
}
```
