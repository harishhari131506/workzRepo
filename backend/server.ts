// ============================================================================
// BACKEND EXAMPLE: Express.js API with Drizzle CRUD Engine (TypeScript Version)
// File: server.ts
// ============================================================================

import express, { Request, Response } from 'express';
import { CrudEngine, ModelSchema } from '../lib/src/index';
import type { CreateRecordData } from '../lib/src/operations/crudOperations';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(express.json());

// const DATABASE_URL = 'postgres://postgres:Harish@936061148@localhost:5432/crud_system';
const DATABASE_URL:any = process.env.DATABASE_URL
console.log(DATABASE_URL , "-----------------DATABASE URL SERVER TS ")

const crudEngine = CrudEngine.getInstance(DATABASE_URL);

console.log(crudEngine)
// ========================== Interfaces ==========================

interface UserBody {
  workspaceId: number;
  name: string;
  email?: string;
  age?: number;
  isActive?: boolean;
  profile?: Record<string, unknown>;
}

interface EventBody {
  workspaceId: number;
  name: string;
  startDate: string;
  endDate: string;
  location: string;
  clientID: number;
  budgetID: number;
  attendees?: unknown[];
}

// // ===================== Initialize Models ========================

async function initializeModels(): Promise<void> {
  const userSchema : ModelSchema = {
    email: "string",
    age: 'integer',
    isActive: 'boolean',
    profile: 'json',
    lastLogin: 'timestamp'
  };

  const eventSchema : ModelSchema  = {
    startDate: 'timestamp',
    endDate: 'timestamp',
    location: 'string',
    clientID: 'integer',
    budgetID: 'integer',
    attendees: 'json'
  };

  await crudEngine.register('User', userSchema);
//   await crudEngine.register('Event', eventSchema);

  console.log('✅ Models registered and tables created!');
}

// =========================== Routes =============================

// CREATE User
app.post('/api/users', async (req: any, res: any) => {
  try {
    const { workspaceId, name, email, age, isActive, profile } = req.body;

    if (!workspaceId || !name) {
      return res.status(400).json({ error: 'workspaceId and name are required' });
    }

    const newUser = await crudEngine.create('User', {
      workspaceId,
      name,
      data: {
        email,
        age,
        isActive: isActive ?? true,
        profile: profile || {},
        lastLogin: new Date().toISOString()
      }
    });

    res.status(201).json({ success: true, user: newUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET All Users
app.get('/api/workspaces/:workspaceId/users', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);

    const users = await crudEngine.getAll('User', workspaceId);

    res.json({ success: true, users, count: users.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET One User
app.get('/api/workspaces/:workspaceId/users/:userId', async (req: any, res: any) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.params.userId;

    const user = await crudEngine.get('User', workspaceId, userId);

    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, user });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE User
app.put('/api/workspaces/:workspaceId/users/:userId', async (req: any, res: any) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.params.userId;
    const { name, email, age, isActive, profile } = req.body as UserBody;
    console.log({ name, email, age, isActive, profile }  , "----------within application")
    const updatedUser = await crudEngine.update('User', workspaceId, userId, {
      name,
      data: {
        email,
        age,
        isActive,
        profile,
        lastLogin: new Date().toISOString()
      }
    });

    if (!updatedUser) return res.status(404).json({ error: 'User not found' });

    res.json({ success: true, user: updatedUser });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE User
app.delete('/api/workspaces/:workspaceId/users/:userId', async (req: any, res: any) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);
    const userId = req.params.userId;

    const deleted = await crudEngine.delete('User', workspaceId, userId);

    if (!deleted) return res.status(404).json({ error: 'User not found or already deleted' });

    res.json({ success: true, message: 'User soft deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// RESTORE User
// app.post('/api/workspaces/:workspaceId/users/:userId/restore', async (req: any, res: any) => {
//   try {
//     const workspaceId = parseInt(req.params.workspaceId);
//     const userId = req.params.userId;

//     const restoredUser = await crudEngine.restore('User', workspaceId, userId);

//     if (!restoredUser) return res.status(404).json({ error: 'No deleted user found to restore' });

//     res.json({ success: true, user: restoredUser, message: 'User restored successfully' });
//   } catch (error: any) {
//     res.status(500).json({ error: error.message });
//   }
// });

// CREATE Event
app.post('/api/events', async (req: any, res: any) => {
  try {
    const { workspaceId, name, startDate, endDate, location, clientID, budgetID, attendees } = req.body;

    if (!workspaceId || !name) {
      return res.status(400).json({ error: 'workspaceId and name are required' });
    }

    const newEvent = await crudEngine.create('Event', {
      workspaceId,
      name,
      data: {
        startDate,
        endDate,
        location,
        clientID,
        budgetID,
        attendees: attendees || []
      }
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// GET All Events
app.get('/api/workspaces/:workspaceId/events', async (req: Request, res: Response) => {
  try {
    const workspaceId = parseInt(req.params.workspaceId);

    const events = await crudEngine.getAll('Event', workspaceId);

    res.json({ success: true, events, count: events.length });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get registered models
app.get('/api/models', (req: Request, res: Response) => {
  const models = crudEngine.getRegisteredModels();
  res.json({ success: true, models });
});

// Get schema of a specific model
app.get('/api/models/:modelName/schema', (req: any, res: any) => {
  const schema = crudEngine.getModelSchema(req.params.modelName);
  if (!schema) return res.status(404).json({ error: 'Model not found' });

  res.json({ success: true, schema });
});

// ======================= Start Server =========================

const PORT = process.env.PORT || 3000;

async function startServer(): Promise<void> {
  try {
    await initializeModels();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Database: PostgreSQL`);
      console.log(`🔧 Models: ${crudEngine.getRegisteredModels().join(', ')}`);
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
