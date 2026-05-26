import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  date,
  boolean,
  tinyint,
} from "drizzle-orm/mysql-core";

// ─── Users (Auth) ────────────────────────────────────────────────────────────
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// WhatsApp configuration table
export const whatsappConfig = mysqlTable("whatsapp_config", {
  id: int("id").autoincrement().primaryKey(),
  evolutionApiUrl: varchar("evolutionApiUrl", { length: 512 }).notNull(),
  evolutionApiKey: varchar("evolutionApiKey", { length: 256 }).notNull(),
  instanceName: varchar("instanceName", { length: 128 }).notNull().default("pibb"),
  isConnected: boolean("isConnected").notNull().default(false),
  welcomeMessageEnabled: boolean("welcomeMessageEnabled").notNull().default(true),
  birthdayMessageEnabled: boolean("birthdayMessageEnabled").notNull().default(true),
  birthdayCronTaskUid: varchar("birthdayCronTaskUid", { length: 65 }),
  welcomeMessage: text("welcomeMessage"),
  birthdayMessage: text("birthdayMessage"),
  leadershipPhone: varchar("leadershipPhone", { length: 20 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type WhatsappConfig = typeof whatsappConfig.$inferSelect;
export type InsertWhatsappConfig = typeof whatsappConfig.$inferInsert;

// WhatsApp message history table
export const whatsappMessages = mysqlTable("whatsapp_messages", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId"),
  memberName: varchar("memberName", { length: 255 }),
  phone: varchar("phone", { length: 30 }).notNull(),
  messageType: varchar("messageType", { length: 50 }).notNull(), // welcome, update, birthday, test, leadership
  messageContent: text("messageContent").notNull(),
  status: varchar("status", { length: 20 }).notNull().default("sent"), // sent, failed
  errorMessage: text("errorMessage"),
  sentAt: timestamp("sentAt").defaultNow().notNull(),
});

export type WhatsappMessage = typeof whatsappMessages.$inferSelect;
export type InsertWhatsappMessage = typeof whatsappMessages.$inferInsert;

// ─── Families ────────────────────────────────────────────────────────────────
export const families = mysqlTable("families", {
  id: int("id").autoincrement().primaryKey(),
  familyCode: varchar("familyCode", { length: 32 }).notNull().unique(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Family = typeof families.$inferSelect;
export type InsertFamily = typeof families.$inferInsert;

// ─── Members ─────────────────────────────────────────────────────────────────
export const members = mysqlTable("members", {
  id: int("id").autoincrement().primaryKey(),
  familyId: int("familyId").references(() => families.id),

  // Dados pessoais
  fullName: varchar("fullName", { length: 255 }).notNull(),
  birthDate: date("birthDate"),
  gender: mysqlEnum("gender", ["masculino", "feminino", "outro"]),
  maritalStatus: mysqlEnum("maritalStatus", [
    "solteiro",
    "casado",
    "uniao_estavel",
    "divorciado",
    "viuvo",
  ]),
  cpf: varchar("cpf", { length: 14 }),

  // Contato
  phone: varchar("phone", { length: 20 }),
  whatsapp: varchar("whatsapp", { length: 20 }),
  email: varchar("email", { length: 320 }),

  // Endereço
  street: varchar("street", { length: 255 }),
  number: varchar("number", { length: 20 }),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 2 }),
  zipCode: varchar("zipCode", { length: 10 }),

  // Dados da Igreja
  congregation: varchar("congregation", { length: 100 }),
  ministry: varchar("ministry", { length: 100 }),
  isBaptized: boolean("isBaptized").default(false),
  baptismDate: date("baptismDate"),
  isTither: mysqlEnum("isTither", ["sim", "nao", "ocasional"]),
  attendanceFrequency: mysqlEnum("attendanceFrequency", [
    "sempre",
    "quase_sempre",
    "as_vezes",
    "raramente",
    "nunca",
  ]),
  serviceArea: varchar("serviceArea", { length: 255 }),
  gifts: text("gifts"),

  // Cônjuge
  spouseName: varchar("spouseName", { length: 255 }),
  spouseBirthDate: date("spouseBirthDate"),
  spousePhone: varchar("spousePhone", { length: 20 }),
  spouseWhatsapp: varchar("spouseWhatsapp", { length: 20 }),
  spouseEmail: varchar("spouseEmail", { length: 320 }),
  spouseIsBaptized: boolean("spouseIsBaptized").default(false),
  spouseBaptismDate: date("spouseBaptismDate"),
  spouseMinistry: varchar("spouseMinistry", { length: 100 }),
  spouseServiceArea: varchar("spouseServiceArea", { length: 255 }),
  spouseIsTither: mysqlEnum("spouseIsTither", ["sim", "nao", "ocasional"]),

  // Classificação
  memberType: mysqlEnum("memberType", [
    "membro_ativo",
    "frequentante",
    "visitante",
    "afastado",
  ]).default("visitante"),

  // Observações pastorais
  pastoralNotes: text("pastoralNotes"),
  aiPastoralSuggestions: text("aiPastoralSuggestions"),

  // Controle
  hasDuplicate: boolean("hasDuplicate").default(false),
  isActive: boolean("isActive").default(true),
  registeredByUserId: int("registeredByUserId"),
  lastUpdatedByUserId: int("lastUpdatedByUserId"),

  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Member = typeof members.$inferSelect;
export type InsertMember = typeof members.$inferInsert;

// ─── Member Children ──────────────────────────────────────────────────────────
export const memberChildren = mysqlTable("member_children", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId")
    .notNull()
    .references(() => members.id),
  familyId: int("familyId").references(() => families.id),
  fullName: varchar("fullName", { length: 255 }).notNull(),
  birthDate: date("birthDate"),
  phone: varchar("phone", { length: 20 }),
  isBaptized: boolean("isBaptized").default(false),
  baptismDate: date("baptismDate"),
  ministry: varchar("ministry", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberChild = typeof memberChildren.$inferSelect;
export type InsertMemberChild = typeof memberChildren.$inferInsert;

// ─── Member Updates (Audit Log) ───────────────────────────────────────────────
export const memberUpdates = mysqlTable("member_updates", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId")
    .notNull()
    .references(() => members.id),
  updatedByUserId: int("updatedByUserId"),
  changeType: mysqlEnum("changeType", ["create", "update", "classify"]).notNull(),
  changeDescription: text("changeDescription"),
  fieldName: varchar("fieldName", { length: 100 }),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberUpdate = typeof memberUpdates.$inferSelect;
export type InsertMemberUpdate = typeof memberUpdates.$inferInsert;

// ─── Admin Users (Login próprio do painel) ────────────────────────────────────
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 64 }).notNull().unique(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  name: text("name").notNull(),
  isActive: boolean("isActive").notNull().default(true),
  lastLoginAt: timestamp("lastLoginAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

// ─── Services (Cultos/Eventos) ────────────────────────────────────────────────
export const services = mysqlTable("services", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  dayOfWeek: mysqlEnum("dayOfWeek", ["segunda", "terca", "quarta", "quinta", "sexta", "sabado", "domingo"]).notNull(),
  time: varchar("time", { length: 5 }),
  isActive: boolean("isActive").default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Service = typeof services.$inferSelect;
export type InsertService = typeof services.$inferInsert;

// ─── Attendance Records (Frequência em Cultos) ────────────────────────────────
export const attendanceRecords = mysqlTable("attendance_records", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId")
    .notNull()
    .references(() => members.id),
  serviceId: int("serviceId")
    .notNull()
    .references(() => services.id),
  attendanceDate: date("attendanceDate").notNull(),
  isPresent: boolean("isPresent").notNull().default(true),
  notes: text("notes"),
  registeredByUserId: int("registeredByUserId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AttendanceRecord = typeof attendanceRecords.$inferSelect;
export type InsertAttendanceRecord = typeof attendanceRecords.$inferInsert;
