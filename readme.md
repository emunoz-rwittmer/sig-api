# interno-api

API backend for interno system, built with Express, Sequelize (MySQL), and Mongoose (MongoDB).

## Setup

1. **Initialize project**
   ```bash
   npm init -y
   ```

2. **Install dependencies**
   ```bash
   npm i express sequelize mysql2 mongoose cors dotenv
   ```
   - `sequelize` + `mysql2`: ORM and MySQL database driver
   - `mongoose`: MongoDB ODM
   - `express`: Web framework
   - `cors`: Cross-Origin Resource Sharing
   - `dotenv`: Environment variable management

3. **Install development dependencies**
   ```bash
   npm i -D nodemon morgan jest supertest
   ```

4. **Project structure**
   ```
   /src
       /services
       /models
       /controllers
       /routes
       /middlewares
       /seeders
       /tests
       /utils
           /templates
       app.js
       server.js
   ```

5. **Environment setup**
   Copy `.env.example` to `.env` and configure your database credentials and other settings.

## Running the Application

- **Development**: `npm run dev` (starts with nodemon auto-reload)
- **Production**: `npm start` (runs server.js directly)
- **Database seeding**: `npm run seed` (runs seeders)

## Testing

Run the test suite with:
```bash
npm test
```

This runs Jest smoke tests in single-run mode. For test files, see `src/tests/` directory and `.env.example` for `ENV_TEST` configuration.

For watch mode during development:
```bash
npm run test:watch
```

## Linting and Formatting

(Added in Phase 0, Task 6)

- **Lint**: `npm run lint` - Check code quality
- **Fix linting issues**: `npm run lint:fix` - Auto-fix ESLint violations
- **Format code**: `npm run format` - Format code with Prettier

## API Documentation

(Available after Phase 0, Task 7)

Start the development server:
```bash
npm run dev
```

Then visit `http://localhost:3000/api/docs` to view the Swagger UI documentation for all available endpoints.
 