import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{userId:text('user_id').primaryKey(),name:text('name').notNull(),created:integer('created').notNull()});
export const ledger=sqliteTable('points_ledger',{id:text('id').primaryKey(),userId:text('user_id').notNull(),points:integer('points').notNull(),description:text('description').notNull(),reward:text('reward'),created:integer('created').notNull()});
