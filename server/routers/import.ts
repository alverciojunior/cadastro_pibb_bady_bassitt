import { z } from "zod";
import { router, pibbAdminProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { getDb } from "../db";
import { members, families } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";

export const importRouter = router({
  // Importar membros de dados CSV/JSON
  importMembers: pibbAdminProcedure
    .input(
      z.object({
        data: z.array(
          z.object({
            fullName: z.string(),
            birthDate: z.string().optional(),
            gender: z.string().optional(),
            maritalStatus: z.string().optional(),
            cpf: z.string().optional(),
            phone: z.string().optional(),
            whatsapp: z.string().optional(),
            email: z.string().optional(),
            street: z.string().optional(),
            number: z.string().optional(),
            complement: z.string().optional(),
            neighborhood: z.string().optional(),
            city: z.string().optional(),
            state: z.string().optional(),
            zipCode: z.string().optional(),
            congregation: z.string().optional(),
            ministry: z.string().optional(),
            isBaptized: z.boolean().optional(),
            baptismDate: z.string().optional(),
            isTither: z.string().optional(),
            attendanceFrequency: z.string().optional(),
            serviceArea: z.string().optional(),
            gifts: z.string().optional(),
            spouseName: z.string().optional(),
            memberType: z.string().optional(),
          })
        ),
        skipDuplicates: z.boolean().default(true),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const results = {
        imported: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; error: string }>,
      };

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];

        try {
          // Validar nome obrigatório
          if (!row.fullName || row.fullName.trim().length === 0) {
            results.errors.push({ row: i + 1, error: "Nome completo é obrigatório" });
            results.skipped++;
            continue;
          }

          // Verificar duplicatas por CPF ou telefone
          if (input.skipDuplicates && (row.cpf || row.phone)) {
            const existing = await db
              .select()
              .from(members)
              .where(
                row.cpf
                  ? eq(members.cpf, row.cpf)
                  : eq(members.phone, row.phone || "")
              )
              .limit(1);

            if (existing.length > 0) {
              results.errors.push({ row: i + 1, error: "Membro já existe (duplicata)" });
              results.skipped++;
              continue;
            }
          }

          // Criar ou obter família
          let familyId: number | null = null;
          if (row.cpf) {
            const familyCode = `FAM-${row.cpf}`;
            const existingFamily = await db
              .select()
              .from(families)
              .where(eq(families.familyCode, familyCode))
              .limit(1);

            if (existingFamily.length > 0) {
              familyId = existingFamily[0].id;
            } else {
              const newFamily = await db.insert(families).values({
                familyCode,
              });
              familyId = newFamily[0].insertId;
            }
          }

          // Inserir membro
          await db.insert(members).values({
            familyId,
            fullName: row.fullName.trim(),
            birthDate: row.birthDate ? new Date(row.birthDate) : null,
            gender: (row.gender as any) || null,
            maritalStatus: (row.maritalStatus as any) || null,
            cpf: row.cpf || null,
            phone: row.phone || null,
            whatsapp: row.whatsapp || null,
            email: row.email || null,
            street: row.street || null,
            number: row.number || null,
            complement: row.complement || null,
            neighborhood: row.neighborhood || null,
            city: row.city || null,
            state: row.state || null,
            zipCode: row.zipCode || null,
            congregation: row.congregation || null,
            ministry: row.ministry || null,
            isBaptized: row.isBaptized || false,
            baptismDate: row.baptismDate ? new Date(row.baptismDate) : null,
            isTither: (row.isTither as any) || null,
            attendanceFrequency: (row.attendanceFrequency as any) || null,
            serviceArea: row.serviceArea || null,
            gifts: row.gifts || null,
            spouseName: row.spouseName || null,
            memberType: (row.memberType as any) || "visitante",
            isActive: true,
          });

          results.imported++;
        } catch (error: any) {
          results.errors.push({
            row: i + 1,
            error: error.message || "Erro desconhecido",
          });
          results.skipped++;
        }
      }

      return results;
    }),

  // Validar dados de importação sem salvar
  validateImportData: pibbAdminProcedure
    .input(
      z.object({
        data: z.array(z.record(z.string(), z.any())),
      })
    )
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const results = {
        valid: 0,
        invalid: 0,
        errors: [] as Array<{ row: number; error: string; data: any }>,
      };

      for (let i = 0; i < input.data.length; i++) {
        const row = input.data[i];

        // Validar nome obrigatório
        if (!row.fullName || typeof row.fullName !== "string" || row.fullName.trim().length === 0) {
          results.errors.push({
            row: i + 1,
            error: "Nome completo é obrigatório e deve ser texto",
            data: row,
          });
          results.invalid++;
          continue;
        }

        // Validar email se fornecido
        if (row.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(row.email))) {
          results.errors.push({
            row: i + 1,
            error: "Email inválido",
            data: row,
          });
          results.invalid++;
          continue;
        }

        // Validar CPF se fornecido (formato básico)
        if (row.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(String(row.cpf))) {
          results.errors.push({
            row: i + 1,
            error: "CPF deve estar no formato XXX.XXX.XXX-XX",
            data: row,
          });
          results.invalid++;
          continue;
        }

        results.valid++;
      }

      return results;
    }),
});
