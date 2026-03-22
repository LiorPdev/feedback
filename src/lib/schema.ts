import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('User', {
    id: text('id').primaryKey(), // Clerk ID
    email: text('email').notNull().unique(),
    name: text('name'),
    provider: text('provider'),
    providerId: text('providerId').unique(),
    tokens: integer('tokens').default(100).notNull(),
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt').notNull().$defaultFn(() => new Date().toISOString()),
});

export const songs = sqliteTable('Song', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull().unique(),
    title: text('title').notNull(),
    genre: text('genre').notNull(),
    slug: text('slug').notNull().unique(),
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => {
    return {
        userIdIdx: index('Song_userId_idx').on(table.userId),
    };
});

export const feedbacks = sqliteTable('Feedback', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    songId: text('songId').notNull().references(() => songs.id, { onDelete: 'cascade' }),
    authorId: text('authorId'), // Clerk ID of the person giving feedback
    lyrics: integer('lyrics').notNull(),
    composition: integer('composition').notNull(),
    production: integer('production').notNull(),
    overall: integer('overall').notNull(),
    comment: text('comment').notNull(),
    playedSeconds: integer('playedSeconds'),
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => {
    return {
        songIdIdx: index('Feedback_songId_idx').on(table.songId),
        authorIdIdx: index('Feedback_authorId_idx').on(table.authorId),
    };
});

export const usersRelations = relations(users, ({ many }) => ({
    songs: many(songs),
}));

export const songsRelations = relations(songs, ({ one, many }) => ({
    user: one(users, {
        fields: [songs.userId],
        references: [users.id],
    }),
    feedbacks: many(feedbacks),
}));

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
    song: one(songs, {
        fields: [feedbacks.songId],
        references: [songs.id],
    }),
}));

export const logs = sqliteTable('Log', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    message: text('message').notNull(),
    data: text('data'), // JSON string
    source: text('source'), // e.g., "server-action:uploadSong"
    userId: text('userId'), // Optional Clerk ID
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => {
    return {
        createdAtIdx: index('Log_createdAt_idx').on(table.createdAt),
    };
});

