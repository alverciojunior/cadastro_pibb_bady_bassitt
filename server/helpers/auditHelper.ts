import { getDb } from "../db";
import { memberUpdates, members } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

export async function recordMemberChanges(
  memberId: number,
  oldData: any,
  newData: any,
  updatedByUserId?: number | null
) {
  const db = await getDb();
  if (!db) return;

  // Lista de campos a rastrear
  const fieldsToTrack = [
    "fullName",
    "birthDate",
    "gender",
    "maritalStatus",
    "cpf",
    "phone",
    "whatsapp",
    "email",
    "street",
    "number",
    "neighborhood",
    "city",
    "state",
    "zipCode",
    "congregation",
    "ministry",
    "isBaptized",
    "baptismDate",
    "isTither",
    "attendanceFrequency",
    "serviceArea",
    "gifts",
    "spouseName",
    "spouseBirthDate",
    "spousePhone",
    "spouseWhatsapp",
    "spouseEmail",
    "spouseIsBaptized",
    "spouseBaptismDate",
    "spouseMinistry",
    "spouseServiceArea",
    "spouseIsTither",
    "memberType",
    "pastoralNotes",
  ];

  // Registrar cada mudança de campo
  for (const field of fieldsToTrack) {
    const oldValue = oldData?.[field];
    const newValue = newData?.[field];

    // Comparar valores (ignorar se ambos são null/undefined)
    if (
      JSON.stringify(oldValue) !== JSON.stringify(newValue) &&
      !(oldValue == null && newValue == null)
    ) {
      await db.insert(memberUpdates).values({
        memberId,
        updatedByUserId: updatedByUserId || null,
        changeType: "update",
        changeDescription: `Campo ${field} alterado`,
        fieldName: field,
        oldValue: oldValue != null ? String(oldValue) : null,
        newValue: newValue != null ? String(newValue) : null,
      });
    }
  }
}

export async function recordMemberCreation(
  memberId: number,
  data: any,
  createdByUserId?: number | null
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(memberUpdates).values({
    memberId,
    updatedByUserId: createdByUserId || null,
    changeType: "create",
    changeDescription: "Membro criado",
  });
}

export async function recordMemberClassification(
  memberId: number,
  oldType: string | null,
  newType: string,
  classifiedByUserId?: number | null
) {
  const db = await getDb();
  if (!db) return;

  await db.insert(memberUpdates).values({
    memberId,
    updatedByUserId: classifiedByUserId || null,
    changeType: "classify",
    changeDescription: `Classificação alterada de ${oldType || "não definida"} para ${newType}`,
    fieldName: "memberType",
    oldValue: oldType,
    newValue: newType,
  });
}
