# Template API

Rest API server for template.

## Prerequisites

This project requires the following in your system

- Node.js 10.x or higher
- PostGreSQL

## Installing

Install project dependencies

```
npm install
```

## Environment Variables

Setup environment variables on development/test/production. Configuration files are located under `{rootDir}/environments` directory. Follow the naming convention `.env.{environment}`, example `.env.development`

```
BASIC_PASSWORD=
BASIC_USERNAME=
DB_CLIENT=pg
DB_HOST=
DB_NAME=
DB_PASSWORD=
DB_PORT=5432
DB_USER=
AUTH_SECRET=F0nch3rt0
TOKEN_EXPIRY_DAYS=365
MOUNT=mnt
AWS_SECRET_ACCESS_KEY=
AWS_ACCESS_KEY=
PROJECT_NAME=
EMAIL_FROM=
SENDGRID_API_KEY=
AZURE_STORE_CONNECTION=
AZURE_CONTAINER=
```

## Development

Running for the first time requires to setup the database schema and seeds first.

```
npm run dev:migrate && npm run dev:seeds
```

Run the application in development mode

```
npm run dev
```

## Production

Generate a production build by running

```
npm run build
```

Run the server

```
npm start
```

## Docker Deployment

Build the image

```
  docker image build -t template-api .
```

Run the container

```
  docker run -d -p 8080:8080 --name template-api
```

Running the app in production automatically updates database schema and seeds in production environment using the `prestart` npm script

## Test

Add test environment variables by creating `.env.test` file under `{rootDir}/environments` directory

```
npm test
```

## Documentation

Open the API documentation on this route `/api-docs`.

## Authentication

All routes are protected by Basic Authentication. Routes that need current user session are protected by JWT Authentication. Authorize your requests with JWT by logging in using this route `/auth/login`. CSRF Token is also implemented because this API uses Cookie-based (http only) JWT.

### Sample Credentials

```
email: bernalesjasper@gmail.com
password: test
```
