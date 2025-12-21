# Tracify - Personal Expense Tracker

Tracify is a full-stack expense tracking application designed to help you manage your finances. It allows you to upload bank statements via CSV, categorize transactions, and visualize your spending habits through a clean, modern dashboard.

## Tech Stack

- **Framework:** [Next.js](https://nextjs.org/) (App Router)
- **Authentication:** [Clerk](https://clerk.com/)
- **Database:** [Supabase](https://supabase.io/) (PostgreSQL)
- **ORM:** [Drizzle ORM](https://orm.drizzle.team/)
- **UI Components:** [shadcn/ui](https://ui.shadcn.com/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Charting:** [Recharts](https://recharts.org/)
- **Theming:** [next-themes](https://github.com/pacocoursey/next-themes)

## Features

- **Secure Authentication:** User sign-up, sign-in, and profile management handled by Clerk.
- **Dashboard:** A visual overview of your finances with a spending summary chart.
- **Transaction Management:** View a list of all your transactions.
- **CSV Import:** Upload transactions from CSV files.
- **Account Management:** Create, view, and delete financial accounts on the settings page.
- **Dark Mode:** Light and dark mode support.

## Getting Started

Follow these instructions to get the project running on your local machine.

### 1. Install Dependencies

Install the required packages using npm:

```bash
npm install
```

### 2. Set Up Environment Variables

Create a file named `.env.local` in the root of the project. You only need to add your database connection string here. Clerk does not require API keys for local development to work.

```env
# .env.local

# Get this from your Supabase project settings
DATABASE_URL="postgresql://user:password@host:port/db"
```

### 3. Run Database Migrations

Apply the database schema to your Supabase instance. This will create all the necessary tables.

```bash
npx drizzle-kit migrate
```

### 4. Run the Development Server

Start the Next.js development server.

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

## Project Structure

- `app/`: Contains all the application routes and pages.
- `app/api/`: Contains all backend API route handlers.
- `components/`: Contains reusable React components (e.g., charts, buttons).
- `components/ui/`: Contains the unstyled UI components from `shadcn/ui`.
- `db/`: Contains the Drizzle ORM schema and database client instance.
- `drizzle/`: Contains the generated SQL migration files.
- `proxy.ts`: The Clerk middleware file that protects routes and provides authentication context.

## Database Schema

The database consists of three main tables:

### `accounts`

Stores user-created financial accounts.

| Column    | Type    | Description                               |
| --------- | ------- | ----------------------------------------- |
| `id`      | text    | Unique identifier for the account.        |
| `name`    | text    | Name of the account (e.g., "Checking").   |
| `userId`  | text    | Foreign key linking to the Clerk user.    |
| `balance` | decimal | The current balance of the account.       |
| `plaidId` | text    | (Future Use) ID for Plaid integration.    |

### `categories`

Stores user-defined spending categories.

| Column    | Type    | Description                                  |
| --------- | ------- | -------------------------------------------- |
| `id`      | text    | Unique identifier for the category.          |
| `name`    | text    | Name of the category (e.g., "Groceries").    |
| `userId`  | text    | Foreign key linking to the Clerk user.       |
| `plaidId` | text    | (Future Use) ID for Plaid integration.       |

### `transactions`

Stores individual financial transactions.

| Column       | Type      | Description                                                     |
| ------------ | --------- | --------------------------------------------------------------- |
| `id`         | text      | Unique identifier for the transaction.                          |
| `amount`     | decimal   | The monetary value of the transaction.                          |
| `payee`      | text      | The recipient of the funds (e.g., "Supermarket").               |
| `notes`      | text      | User-provided notes for the transaction.                        |
| `date`       | timestamp | The date the transaction occurred.                              |
| `accountId`  | text      | Foreign key linking to the `accounts` table.                    |
| `categoryId` | text      | (Optional) Foreign key linking to the `categories` table.       |

## API Endpoints

The application exposes the following RESTful API endpoints:

### `/api/accounts`

-   `GET`: Fetches all accounts belonging to the currently logged-in user.
-   `POST`: Creates a new account for the logged-in user.

### `/api/accounts/[id]`

-   `PATCH`: Updates the name or balance of a specific account.
-   `DELETE`: Deletes a specific account.

### `/api/transactions`

-   `GET`: Fetches a list of transactions for the logged-in user. Supports filtering by `accountId`, `from` (start date), and `to` (end date) as URL query parameters.

### `/api/transactions/import`

-   `POST`: Imports a batch of transactions from a parsed CSV file to a specified account.

### `/api/summary`

-   `GET`: Fetches aggregated spending data, grouped by category, for the logged-in user. Supports filtering by `accountId`, `from`, and `to` dates.

## Notes


- **`plaid_id` columns:** You will notice `plaid_id` columns in the database schema. These are for future-proofing and do not have any function right now. They are included to make it easier to add direct bank syncing via [Plaid](https://plaid.com/) in the future.

- **Production Build Issue:** There is a known issue with the production build command (`npm run build`) that fails due to a persistent type error in the Next.js build process. However, the application is fully functional in development mode (`npm run dev`).
