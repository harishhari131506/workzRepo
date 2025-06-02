
# Generic CRUD System with Drizzle ORM

A production-grade, generic CRUD system built with TypeScript, Express, and Drizzle ORM that provides standardized database operations across multiple models.

## Features

### Core Features
- **Standardized Schema**: All tables follow a consistent structure with `wid`, `id`, `name`, `data`, `created_at`, and `deleted_at`
- **Generic CRUD Engine**: Reusable CRUD operations that work with any registered model
- **Advanced Query Support**: Pagination, filtering, sorting, field selection
- **Soft Deletes**: Built-in soft delete functionality with restore capability
- **Bulk Operations**: Support for bulk create and operations
- **Offline Sync**: Handle offline operations with automatic synchronization

### Query Operators
- **Pagination**: `page`, `limit`
- **Sorting**: `sort` with `desc_` prefix support
- **Filtering**: `ne_`, `lt_`, `gt_`, `lte_`, `gte_`, `in_`, `prefix_`, `suffix_`, `substr_`
- **Field Selection**: `select` parameter
- **Soft Delete Control**: `deleted` parameter

### Production Features
- **Rate Limiting**: Configurable request rate limiting
- **Security**: Helmet.js security headers, CORS support
- **Logging**: Structured logging with Winston
- **Error Handling**: Comprehensive error handling middleware
- **Validation**: Request validation with Joi
- **Compression**: Response compression
- **Health Checks**: Built-in health check endpoints

## Quick Start

### 1. Installation
```bash
npm install
```

### 2. Environment Setup
```bash
cp .env.example .env
# Edit .env with your database credentials
```

### 3. Database Setup
```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate
```

### 4. Development
```bash
npm run dev
```

### 5. Production
```bash
npm run build
npm start
```

## API Usage

### Base URL
```
http://localhost:3000/api
```

### Endpoints

#### List Records
```http
GET /api/{model}?page=1&limit=10&sort=desc_created_at&name_substr=search
```

#### Get Single Record
```http
GET /api/{model}/{id}
```

#### Create Record
```http
POST /api/{model}
Content-Type: application/json

{
  "name": "Example Record",
  "data": {
    "custom": "fields",
    "go": "here"
  }
}
```

#### Update Record
```http
PUT /api/{model}/{id}
Content-Type: application/json

{
  "name": "Updated Name",
  "data": {
    "updated": "data"
  }
}
```

#### Delete Record (Soft)
```http
DELETE /api/{model}/{id}
```

#### Delete Record (Hard)
```http
DELETE /api/{model}/{id}?hard=true
```

#### Restore Record
```http
POST /api/{model}/{id}/restore
```

#### Bulk Create
```http
POST /api/{model}/bulk
Content-Type: application/json

{
  "items": [
    {
      "name": "Record 1",
      "data": {}
    },
    {
      "name": "Record 2", 
      "data": {}
    }
  ]
}
```

#### Count Records
```http
GET /api/{model}/count?filters=here
```

### Query Examples

#### Pagination
```http
GET /api/users?page=2&limit=25
```

#### Filtering
```http
GET /api/users?name_substr=john&created_at_gt=2024-01-01
```

#### Sorting
```http
GET /api/users?sort=desc_created_at,name
```

#### Field Selection
```http
GET /api/users?select=id,name,created_at
```

#### Include Deleted
```http
GET /api/users?deleted=true
```

#### Complex Query
```http
GET /api/products?page=1&limit=20&sort=desc_created_at&name_substr=laptop&price_gt=500&category_in=electronics,computers&select=id,name,data
```

## Architecture

### Models
The system comes with three example models:
- **Users** (`/api/users`)
- **Products** (`/api/products`) 
- **Orders** (`/api/orders`)

### Adding New Models

1. **Create Schema**
```typescript
// src/database/schemas/my-model.ts
import { createStandardTable } from './base';

export const myModel = createStandardTable('my_model');
export type MyModel = typeof myModel.$inferSelect;
export type NewMyModel = typeof myModel.$inferInsert;
```

2. **Register Model**
```typescript
// src/services/model-registry.ts
import { myModel } from '../database/schemas/my-model';

export function registerModels() {
  const registry = CrudRegistry.getInstance();
  registry.register('my-model', myModel);
}
```

3. **Generate Migration**
```bash
npm run db:generate
npm run db:migrate
```

### Offline Sync Usage

```typescript
import { OfflineSyncService } from './services/offline-sync';

const syncService = new OfflineSyncService('http://localhost:3000/api');

// Operations work online/offline automatically
const user = await syncService.executeOperation('users', 'create', {
  name: 'John Doe',
  data: { role: 'admin' }
});

// Check sync status
console.log('Online:', syncService.isNetworkOnline());
console.log('Pending:', syncService.getPendingOperations());
```

## Production Deployment

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@host:port/db
NODE_ENV=production
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=warn
CORS_ORIGIN=https://yourdomain.com
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

### Database Migrations
```bash
# Production migration
NODE_ENV=production npm run db:migrate
```

## Monitoring

### Health Check
```http
GET /api/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "models": ["users", "products", "orders"]
}
```

### Logs
- Error logs: `logs/error.log`
- Combined logs: `logs/combined.log`
- Console output in development
