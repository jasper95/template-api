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

Setup environment variables on development/test/production. Configuration files are located under `environments` directory. You only need to change database configuration as follows

```
BASIC_PASSWORD=
BASIC_USERNAME=

DB_CLIENT=pg
DB_HOST=
DB_NAME=
DB_PASSWORD=
DB_PORT=5432
DB_USER=

AUTH_SECRET=
TOKEN_EXPIRY_DAYS=
PROJECT_NAME=
SENDGRID_API_KEY=
AZURE_STORE_CONNECTION=
AZURE_CONTAINER=
PORT=
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

```
npm test
```
