import { neon } from "@neondatabase/serverless";
import "dotenv/config";

const sql = neon(process.env.DATABASE_URL!);

async function resetDatabase() {
  try {
    console.log("Dropping all tables...");
    
    await sql`
      DROP TABLE IF EXISTS transactions CASCADE;
    `;
    
    await sql`
      DROP TABLE IF EXISTS balances CASCADE;
    `;
    
    await sql`
      DROP TABLE IF EXISTS accounts CASCADE;
    `;
    
    await sql`
      DROP TABLE IF EXISTS categories CASCADE;
    `;
    
    await sql`
      DROP TABLE IF EXISTS connected_banks CASCADE;
    `;
    
    await sql`
      DROP TYPE IF EXISTS transaction_type CASCADE;
    `;
    
    console.log("All tables dropped successfully!");
    console.log("Now run: npx drizzle-kit push");
  } catch (error) {
    console.error("Error resetting database:", error);
    process.exit(1);
  }
}

resetDatabase();


