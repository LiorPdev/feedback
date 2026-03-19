-- Drop old tables if they exist (in case 0001 was applied)
DROP TABLE IF EXISTS "Feedback";
DROP TABLE IF EXISTS "Song";
DROP TABLE IF EXISTS "User";

-- CreateTable User
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "provider" TEXT,
    "providerId" TEXT,
    "tokens" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

-- CreateTable Song
CREATE TABLE "Song" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "genre" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Song_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable Feedback
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "songId" TEXT NOT NULL,
    "lyrics" INTEGER NOT NULL,
    "composition" INTEGER NOT NULL,
    "production" INTEGER NOT NULL,
    "overall" INTEGER NOT NULL,
    "comment" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Feedback_songId_fkey" FOREIGN KEY ("songId") REFERENCES "Song" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_providerId_key" ON "User"("providerId");
CREATE UNIQUE INDEX "Song_url_key" ON "Song"("url");
CREATE UNIQUE INDEX "Song_slug_key" ON "Song"("slug");
CREATE INDEX "Song_userId_idx" ON "Song"("userId");
CREATE INDEX "Feedback_songId_idx" ON "Feedback"("songId");
