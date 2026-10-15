import { createCertificationPeriod } from "../../repositories/certification-period.repository";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);

  if (!body.certification_type_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "certification_type_id wajib diisi",
    });
  }

  if (!body.category_id) {
    throw createError({
      statusCode: 400,
      statusMessage: "category_id wajib diisi",
    });
  }

  if (!body.period_name) {
    throw createError({
      statusCode: 400,
      statusMessage: "period_name wajib diisi",
    });
  }

  if (!body.period_status) {
    throw createError({
      statusCode: 400,
      statusMessage: "period_status wajib diisi",
    });
  }

  if (!body.created_by) {
    throw createError({
      statusCode: 400,
      statusMessage: "created_by wajib diisi",
    });
  }

  const period = await createCertificationPeriod({
    certification_type_id: body.certification_type_id,
    category_id: body.category_id,
    period_name: body.period_name,
    period_status: body.period_status,
    created_by: body.created_by,
  });

  return {
    success: true,
    message: "Periode sertifikasi berhasil dibuat.",
    data: period,
  };
});