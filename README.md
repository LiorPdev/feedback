#
# Feedback Space
#

## Run the development: 
npm run dev

## Push your schema changes to the LOCAL DATABASE:
npx drizzle-kit generate --name [any_name]
npx wrangler d1 migrations apply feedback-db --local

## View and edit your LOCAL DATABASE:
npm run studio

## Push your schema changes to the CLOUDFLARE DATABASE:
npx wrangler d1 migrations apply feedback-db --remote

## To deploy the project to Cloudflare Pages:
Do Commit & Push from Menu

## Mail Service
feedback.space.app@gmail.com
contact@feedback.activitywiz.com
Using https://www.brevo.com/ as mail service

## File Storage Service
https://dash.cloudflare.com/9c530885ad264c96d05babc5c7dc69a3/r2/default/buckets/feedback-space
Token value (ffu): cfat_ywHZVFDl0YYXHpA9aZ4lQXyOX7gknw2Z1dyc8ntJ11001334