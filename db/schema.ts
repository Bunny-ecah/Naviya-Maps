import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const profiles=sqliteTable('profiles',{userId:text('user_id').primaryKey(),name:text('name').notNull(),created:integer('created').notNull()});
export const ledger=sqliteTable('points_ledger',{id:text('id').primaryKey(),userId:text('user_id').notNull(),points:integer('points').notNull(),description:text('description').notNull(),reward:text('reward'),created:integer('created').notNull()},t=>[index('points_ledger_user_created').on(t.userId,t.created)]);
export const serviceUsage=sqliteTable('service_usage',{bucket:text('bucket').primaryKey(),requests:integer('requests').notNull().default(0),expires:integer('expires').notNull()},t=>[index('service_usage_expires').on(t.expires)]);
