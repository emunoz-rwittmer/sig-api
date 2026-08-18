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
 
## Email Templates

All transactional emails live in `src/mails` and share a single reusable layout. Every template is rendered with the blue Rolf Wittmer standard (Segoe UI font, `#004aad` accent, centered logo, standard footer) via the `mailLayout()` helper — there is no duplicated `<style>`/`<head>` markup across templates.

### Layout helper

`src/mails/mailLayout.js` exports `mailLayout({ title, bodyHtml, button, imageWidth })`:

| Param | Type | Description |
|-------|------|-------------|
| `title` | string | Main heading (`<h2>`) |
| `bodyHtml` | string | Email body in HTML (paragraphs, lists, etc.) |
| `button` | `{ text, href }` \| `null` | Optional CTA button |
| `imageWidth` | number | Logo width in px (default `200`) |

Returns the full HTML string for the email.

### Template modules

| File | Class | Templates |
|------|-------|-----------|
| `mailTemplates.js` | `MailTemplates` | `htmlNewUser`, `htmlStaffForgotPassword`, `htmlForgotPassword`, `htmlContentNewEvaluations`, `htmlContentCommentCards`, `htmlContentRetoalimentationEvaluation` |
| `mailConfirmation.js` | `MailConfirmation` | `htmlConfirmationOrder`, `htmlDispatch`, `htmlConsumoRealizado`, `htmlInvoicePassenger` |
| `mailOrder.js` | `MailOrder` | `htmlNewOrder`, `htmlNewRequest` |
| `mailRequests.js` | `MailRequests` | `htmlNuevaSolicitud`, `htmlConfirmacionLectura`, `htmlGuiaRemisionCreada` |
| `mailAttachments.js` | — | `sendEmailWithAttachments`, `sendCruiseReportEmail` (with file attachments) |

### Sending emails

`src/mails/mailer.js` wraps the templates with SendGrid (`@sendgrid/mail`) and exposes the `send*` functions consumed by the controllers (e.g. `sendEmail`, `sendEmailNewOrder`, `sendEmailNuevaSolicitud`, `sendInvoiceEmail`, `sendEmailCommentCard`). To add a new email, create a template method that calls `mailLayout(...)` and expose a `send*` wrapper in `mailer.js`.

### Adding a new email

1. Add a static method to the relevant template module that returns `mailLayout({ ... })`.
2. Add a `send*` function in `mailer.js` that builds the `msg` object and calls `sgMail.send(msg)`.
3. Import and call it from the corresponding controller.
