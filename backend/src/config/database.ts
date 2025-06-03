
export const databaseConfig = {
  url: process.env.DATABASE_URL || 'postgresql://postgres:Harish%409360461148@localhost:5432/crud_system',
  pool: {
    min: 2,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  },
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};