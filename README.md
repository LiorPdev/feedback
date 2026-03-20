# Feedback Space

## Run the development: 
npm run dev


## Push your schema changes to the local DATABASE:
npx drizzle-kit generate --name [any_name]
npx wrangler d1 migrations apply feedback-db --local

## View and edit your local DATABASE:
npm run studio

## Push your schema changes to the Cloudflare D1 DATABASE:
npx wrangler d1 migrations apply feedback-db --remote

## To deploy the project to Cloudflare Pages:
Do Commit & Push
