import { sqliteTable, text, integer, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

export const users = sqliteTable('User', {
    id: text('id').primaryKey(), // Clerk ID
    email: text('email').notNull().unique(),
    name: text('name'),
    provider: text('provider'),
    providerId: text('providerId').unique(),
    tokens: integer('tokens').default(100).notNull(),
    userRank: integer('userRank').default(1).notNull(),
    userGenre: text('userGenre'),
    socialLinks: text('socialLinks'), // JSON string: { spotify?: string, youtube?: string, appleMusic?: string, facebook?: string, instagram?: string, website?: string }
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => {
    return {
        createdAtIdx: index('User_createdAt_idx').on(table.createdAt),
    };
});

export const songs = sqliteTable('Song', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    userId: text('userId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    url: text('url').notNull(),
    title: text('title').notNull(),
    genre: text('genre').notNull(),
    artist: text('artist'),
    isActive: integer('isActive', { mode: 'boolean' }).default(true).notNull(),
    slug: text('slug').notNull().unique(),
    topRatedLastNotified: text('topRatedLastNotified'),
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text('updatedAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => {
    return {
        userIdCreatedAtIdx: index('Song_userId_createdAt_idx').on(table.userId, table.createdAt),
        createdAtIdx: index('Song_createdAt_idx').on(table.createdAt),
        isActiveIdx: index('Song_isActive_idx').on(table.isActive),
    };
});

export const feedbacks = sqliteTable('Feedback', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    songId: text('songId').notNull().references(() => songs.id, { onDelete: 'cascade' }),
    authorId: text('authorId'),         // Clerk ID of the person giving feedback
    cat1: integer('cat1').notNull(),    // Currently unused
    cat2: integer('cat2').notNull(),    // Production
    cat3: integer('cat3').notNull(),    // Singing
    overall: integer('overall').notNull(),
    comment: text('comment').notNull(),
    playedSeconds: integer('playedSeconds'),
    isUnlocked: integer('isUnlocked', { mode: 'boolean' }).default(false).notNull(),
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => {
    return {
        songIdAuthorIdUniqueIdx: uniqueIndex('Feedback_songId_authorId_idx').on(table.songId, table.authorId),
        songIdCreatedAtIdx: index('Feedback_songId_createdAt_idx').on(table.songId, table.createdAt),
        authorIdIdx: index('Feedback_authorId_idx').on(table.authorId),
        createdAtIdx: index('Feedback_createdAt_idx').on(table.createdAt),
    };
});

export const listenEvents = sqliteTable('ListenEvent', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    songId: text('songId').notNull().references(() => songs.id, { onDelete: 'cascade' }),
    userId: text('userId').references(() => users.id, { onDelete: 'set null' }),
    playedSeconds: integer('playedSeconds').notNull(),
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
}, (table) => {
    return {
        userIdIdx: index('ListenEvent_userId_idx').on(table.userId),
        songIdCreatedAtIdx: index('ListenEvent_songId_createdAt_idx').on(table.songId, table.createdAt),
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
    listenEvents: many(listenEvents),
}));

export const feedbacksRelations = relations(feedbacks, ({ one }) => ({
    song: one(songs, {
        fields: [feedbacks.songId],
        references: [songs.id],
    }),
}));

export const listenEventsRelations = relations(listenEvents, ({ one }) => ({
    song: one(songs, {
        fields: [listenEvents.songId],
        references: [songs.id],
    }),
    user: one(users, {
        fields: [listenEvents.userId],
        references: [users.id],
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

export const creditCodes = sqliteTable('CreditCode', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    code: text('code').notNull().unique(),
    amount: integer('amount').notNull(),
    senderId: text('senderId').notNull().references(() => users.id, { onDelete: 'cascade' }),
    isRedeemed: integer('isRedeemed', { mode: 'boolean' }).default(false).notNull(),
    redeemerId: text('redeemerId').references(() => users.id, { onDelete: 'set null' }),
    createdAt: text('createdAt').notNull().$defaultFn(() => new Date().toISOString()),
    expiresAt: text('expiresAt'),
}, (table) => {
    return {
        codeIdx: uniqueIndex('CreditCode_code_idx').on(table.code),
        senderIdIdx: index('CreditCode_senderId_idx').on(table.senderId),
    };
});
