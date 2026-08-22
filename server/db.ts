import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { emailAlertSettings, InsertUser, users } from "../drizzle/schema";
import { ENV } from './_core/env';
import { decryptEmailServiceSecret, encryptEmailServiceSecret } from "./emailAlertCrypto";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export type EmailAlertRecipients = {
  primaryEmail: string;
  optionalEmail1: string | null;
  optionalEmail2: string | null;
  optionalEmail3: string | null;
  optionalEmail4: string | null;
};

export type EmailServiceConfiguration = {
  emailFrom: string | null;
  hasResendApiKey: boolean;
};

export type EmailAlertDeliveryConfiguration = {
  recipients: string[];
  emailFrom: string;
  resendApiKey: string;
};

export async function getEmailAlertRecipients(): Promise<EmailAlertRecipients | null | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const settings = await db.select().from(emailAlertSettings).limit(1);
  const current = settings[0];
  if (!current) return null;

  return {
    primaryEmail: current.primaryEmail,
    optionalEmail1: current.optionalEmail1,
    optionalEmail2: current.optionalEmail2,
    optionalEmail3: current.optionalEmail3,
    optionalEmail4: current.optionalEmail4,
  };
}

export async function saveEmailAlertRecipients(
  recipients: EmailAlertRecipients,
): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const values = {
    primaryEmail: recipients.primaryEmail,
    optionalEmail1: recipients.optionalEmail1 || null,
    optionalEmail2: recipients.optionalEmail2 || null,
    optionalEmail3: recipients.optionalEmail3 || null,
    optionalEmail4: recipients.optionalEmail4 || null,
  };
  const current = await db.select({ id: emailAlertSettings.id }).from(emailAlertSettings).limit(1);

  if (current[0]) {
    await db.update(emailAlertSettings).set(values).where(eq(emailAlertSettings.id, current[0].id));
  } else {
    await db.insert(emailAlertSettings).values(values);
  }

  return true;
}

export async function getEmailServiceConfiguration(): Promise<EmailServiceConfiguration | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const settings = await db.select().from(emailAlertSettings).limit(1);
  const current = settings[0];

  return {
    emailFrom: current?.emailFrom ?? null,
    hasResendApiKey: Boolean(current?.resendApiKeyEncrypted && current?.resendApiKeyIv),
  };
}

export async function saveEmailServiceConfiguration(input: {
  emailFrom: string | null;
  resendApiKey?: string;
}): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;

  const settings = await db.select({ id: emailAlertSettings.id }).from(emailAlertSettings).limit(1);
  const current = settings[0];
  if (!current) return false;

  const values: {
    emailFrom: string | null;
    resendApiKeyEncrypted?: string;
    resendApiKeyIv?: string;
  } = { emailFrom: input.emailFrom || null };

  if (input.resendApiKey) {
    const encrypted = encryptEmailServiceSecret(input.resendApiKey);
    values.resendApiKeyEncrypted = encrypted.encrypted;
    values.resendApiKeyIv = encrypted.iv;
  }

  await db.update(emailAlertSettings).set(values).where(eq(emailAlertSettings.id, current.id));
  return true;
}

export async function getEmailAlertDeliveryConfiguration(): Promise<
  EmailAlertDeliveryConfiguration | null | undefined
> {
  const db = await getDb();
  if (!db) return undefined;

  const settings = await db.select().from(emailAlertSettings).limit(1);
  const current = settings[0];
  if (!current?.emailFrom || !current.resendApiKeyEncrypted || !current.resendApiKeyIv) return null;

  try {
    const recipients = [
      current.primaryEmail,
      current.optionalEmail1,
      current.optionalEmail2,
      current.optionalEmail3,
      current.optionalEmail4,
    ]
      .filter((email): email is string => Boolean(email))
      .map((email) => email.trim().toLowerCase())
      .filter((email, index, emails) => emails.indexOf(email) === index);

    return {
      recipients,
      emailFrom: current.emailFrom,
      resendApiKey: decryptEmailServiceSecret(current.resendApiKeyEncrypted, current.resendApiKeyIv),
    };
  } catch (error) {
    console.error("[Email Alerts] Não foi possível carregar a chave do serviço de e-mail:", error);
    return null;
  }
}
