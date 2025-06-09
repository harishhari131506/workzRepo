// ============================================================================
// FILE: src/database/connection.ts
// Purpose: Handle database connections for different dialects (Postgres/SQLite)
// ============================================================================

import { drizzle } from "drizzle-orm/node-postgres";
import { drizzle as drizzleSqlite } from "drizzle-orm/libsql";
import { Pool } from "pg";
import { createClient } from "@libsql/client";
import type { DatabaseDialect } from "../types";
import { sql } from "drizzle-orm";

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private dbInstance: any;
  private dialect: DatabaseDialect;

  private constructor(connectionUrl: string) {
    this.dialect = this.detectDialect(connectionUrl);
    this.initializeConnection();
  }

  // Singleton pattern - only one database connection per application
  public static getInstance(connectionUrl: string): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection(connectionUrl);
    }
    return DatabaseConnection.instance;
  }

  // Detect if connection URL is for Postgres or LibSQL
  private detectDialect(connectionUrl: string): DatabaseDialect {
    console.log("*******", connectionUrl);

    if (
      connectionUrl.startsWith("postgres://") ||
      connectionUrl.startsWith("postgresql://")
    ) {
      return { type: "postgres", connectionUrl };
    } else if (
      connectionUrl.startsWith("libsql://") ||
      connectionUrl.startsWith("file:") ||
      connectionUrl.endsWith(".db")
    ) {
      return { type: "sqlite", connectionUrl };
    }
    throw new Error(
      "Unsupported database dialect. Use postgres:// or libsql:// or .db file"
    );
  }

  // Initialize the actual database connection based on dialect
  private async initializeConnection() {
    if (this.dialect.type === "postgres") {
      // const pool = new Pool({
      //   connectionString: this.dialect.connectionUrl,
      // });
      const url = new URL(this.dialect.connectionUrl);

      const pool = new Pool({
        user: url.username,
        password: decodeURIComponent(url.password),
        host: url.hostname,
        port: Number(url.port),
        database: url.pathname.slice(1),
      });

      console.log(
        "======================================================================"
      );
      console.log(
        "--------123---------",
        url.username,
        decodeURIComponent(url.password),
        url.hostname,
        Number(url.port),
        url.pathname.slice(1)
      );
      console.log(
        "======================================================================"
      );

      this.dbInstance = drizzle({ client: pool });
      try {
        console.log("Before test query");
        await this.dbInstance.execute(sql`SELECT 1`);
        console.log("After test query");
      } catch (err) {
        console.error("Error during test query:", err);
      }

      console.log("Postgres connection ready!");

      console.log("coming for connection.......", this.dialect.connectionUrl);
    } else if (this.dialect.type === "sqlite") {
      const client = createClient({
        url: this.dialect.connectionUrl,
      });
      this.dbInstance = drizzleSqlite(client);
    }
  }

  public getDatabase() {
    return this.dbInstance;
  }

  public getDialect() {
    return this.dialect;
  }
}
