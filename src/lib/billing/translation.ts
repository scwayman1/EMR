/**
 * Statement + Document Translation (EMR-122)
 * ------------------------------------------
 * The platform-wide translation effort spans messaging, video
 * captions, and documents. The pieces that touch billing —
 * statements, EOB summaries, payment-plan terms — live here so the
 * statement renderer can produce a translated PDF without depending
 * on the message-thread translator or the captions pipeline.
 *
 * Two layers:
 *   1. Static template phrases (statement headers, line-item labels,
 *      payment instructions). Pre-translated, table-driven, no LLM
 *      runtime cost.
 *   2. Dynamic free-text (provider notes embedded in a statement,
 *      AI-generated EOB summary). Routed through the configurable
 *      translation provider.
 *
 * The translation provider is abstracted behind an interface — same
 * pattern as `PaymentGateway`. Day-1 implementations: a stub that
 * passes English through unchanged (CI/dev), and a real provider
 * that hits Google Translate / DeepL.
 */

export type SupportedLanguage = "en" | "es" | "vi" | "gu" | "hi" | "zh" | "ar" | "fr";

export const SUPPORTED_LANGUAGES: Array<{
  code: SupportedLanguage;
  englishName: string;
  nativeName: string;
  rtl: boolean;
}> = [
  { code: "en", englishName: "English", nativeName: "English", rtl: false },
  { code: "es", englishName: "Spanish", nativeName: "Español", rtl: false },
  { code: "vi", englishName: "Vietnamese", nativeName: "Tiếng Việt", rtl: false },
  { code: "gu", englishName: "Gujarati", nativeName: "ગુજરાતી", rtl: false },
  { code: "hi", englishName: "Hindi", nativeName: "हिन्दी", rtl: false },
  { code: "zh", englishName: "Mandarin", nativeName: "中文", rtl: false },
  { code: "ar", englishName: "Arabic", nativeName: "العربية", rtl: true },
  { code: "fr", englishName: "French", nativeName: "Français", rtl: false },
];

export function isRtl(lang: SupportedLanguage): boolean {
  return SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.rtl ?? false;
}

export type StatementPhraseKey =
  | "statement.title"
  | "statement.dueDate"
  | "statement.amountDue"
  | "statement.priorBalance"
  | "statement.insurancePaid"
  | "statement.adjustments"
  | "statement.totalCharges"
  | "statement.payNow"
  | "statement.paymentPlan"
  | "statement.contactBilling"
  | "statement.thankYou"
  | "eob.title"
  | "eob.summary"
  | "eob.youOwe"
  | "eob.insurancePaid";

const STATIC_PHRASES: Record<StatementPhraseKey, Record<SupportedLanguage, string>> = {
  "statement.title": {
    en: "Statement", es: "Estado de cuenta", vi: "Bản sao kê", gu: "નિવેદન",
    hi: "विवरण", zh: "账单", ar: "كشف الحساب", fr: "Relevé",
  },
  "statement.dueDate": {
    en: "Due date", es: "Fecha de vencimiento", vi: "Hạn thanh toán", gu: "નિયત તારીખ",
    hi: "नियत तारीख", zh: "到期日", ar: "تاريخ الاستحقاق", fr: "Date d’échéance",
  },
  "statement.amountDue": {
    en: "Amount due", es: "Monto adeudado", vi: "Số tiền phải trả", gu: "બાકી રકમ",
    hi: "देय राशि", zh: "应付金额", ar: "المبلغ المستحق", fr: "Montant dû",
  },
  "statement.priorBalance": {
    en: "Prior balance", es: "Saldo anterior", vi: "Số dư trước", gu: "પૂર્વ બેલેન્સ",
    hi: "पिछला शेष", zh: "先前余额", ar: "الرصيد السابق", fr: "Solde antérieur",
  },
  "statement.insurancePaid": {
    en: "Insurance paid", es: "Pago del seguro", vi: "Bảo hiểm đã trả", gu: "વીમો ચૂકવ્યો",
    hi: "बीमा द्वारा भुगतान", zh: "保险已付", ar: "دفع التأمين", fr: "Payé par l’assurance",
  },
  "statement.adjustments": {
    en: "Adjustments", es: "Ajustes", vi: "Điều chỉnh", gu: "સમાયોજનો",
    hi: "समायोजन", zh: "调整", ar: "التعديلات", fr: "Ajustements",
  },
  "statement.totalCharges": {
    en: "Total charges", es: "Cargos totales", vi: "Tổng phí", gu: "કુલ શુલ્ક",
    hi: "कुल शुल्क", zh: "总费用", ar: "إجمالي الرسوم", fr: "Frais totaux",
  },
  "statement.payNow": {
    en: "Pay now", es: "Pagar ahora", vi: "Thanh toán ngay", gu: "હમણાં ચૂકવો",
    hi: "अभी भुगतान करें", zh: "立即支付", ar: "ادفع الآن", fr: "Payer maintenant",
  },
  "statement.paymentPlan": {
    en: "Set up a payment plan", es: "Establecer un plan de pago", vi: "Thiết lập kế hoạch thanh toán",
    gu: "ચુકવણી યોજના સેટ કરો", hi: "भुगतान योजना सेट करें", zh: "设置付款计划",
    ar: "إعداد خطة الدفع", fr: "Mettre en place un plan de paiement",
  },
  "statement.contactBilling": {
    en: "Questions? Contact billing.", es: "¿Preguntas? Comuníquese con facturación.",
    vi: "Có câu hỏi? Liên hệ bộ phận thanh toán.", gu: "પ્રશ્નો? બિલિંગનો સંપર્ક કરો.",
    hi: "प्रश्न? बिलिंग से संपर्क करें।", zh: "有疑问？请联系账单部门。",
    ar: "هل لديك أسئلة؟ اتصل بقسم الفواتير.", fr: "Des questions ? Contactez la facturation.",
  },
  "statement.thankYou": {
    en: "Thank you for choosing our practice.", es: "Gracias por elegir nuestra práctica.",
    vi: "Cảm ơn bạn đã chọn phòng khám của chúng tôi.", gu: "અમારી પ્રેક્ટિસ પસંદ કરવા બદલ આભાર.",
    hi: "हमारे क्लिनिक को चुनने के लिए धन्यवाद।", zh: "感谢您选择我们的诊所。",
    ar: "شكرًا لاختياركم عيادتنا.", fr: "Merci d’avoir choisi notre cabinet.",
  },
  "eob.title": {
    en: "Explanation of Benefits", es: "Explicación de beneficios", vi: "Giải thích quyền lợi",
    gu: "લાભોની સમજૂતી", hi: "लाभों की व्याख्या", zh: "福利说明",
    ar: "بيان المزايا", fr: "Explication des prestations",
  },
  "eob.summary": {
    en: "Plain-language summary", es: "Resumen en lenguaje sencillo",
    vi: "Tóm tắt ngôn ngữ đơn giản", gu: "સરળ ભાષામાં સારાંશ",
    hi: "सरल भाषा में सारांश", zh: "通俗语言摘要",
    ar: "ملخص بلغة بسيطة", fr: "Résumé en langage simple",
  },
  "eob.youOwe": {
    en: "Your responsibility", es: "Su responsabilidad", vi: "Trách nhiệm của bạn",
    gu: "તમારી જવાબદારી", hi: "आपकी ज़िम्मेदारी", zh: "您应付的金额",
    ar: "ما تتحمله", fr: "Votre responsabilité",
  },
  "eob.insurancePaid": {
    en: "Insurance paid", es: "Pago del seguro", vi: "Bảo hiểm đã trả", gu: "વીમો ચૂકવ્યો",
    hi: "बीमा द्वारा भुगतान", zh: "保险已付", ar: "دفع التأمين", fr: "Payé par l’assurance",
  },
};

export function phrase(key: StatementPhraseKey, lang: SupportedLanguage): string {
  return STATIC_PHRASES[key][lang] ?? STATIC_PHRASES[key].en;
}

export interface TranslationProvider {
  readonly name: string;
  translate(input: {
    text: string;
    targetLang: SupportedLanguage;
    sourceLang?: SupportedLanguage;
    domain?: "billing-statement" | "eob-summary" | "general";
  }): Promise<string>;
}

/** Pass-through for tests + dev. */
export class StubTranslationProvider implements TranslationProvider {
  readonly name = "stub";
  async translate(input: {
    text: string;
    targetLang: SupportedLanguage;
    sourceLang?: SupportedLanguage;
  }): Promise<string> {
    if (!input.sourceLang || input.sourceLang === input.targetLang) return input.text;
    return `[${input.targetLang}] ${input.text}`;
  }
}

export interface TranslatableStatement {
  totals: {
    totalCharges: string;
    insurancePaid: string;
    adjustments: string;
    priorBalance: string;
    amountDue: string;
  };
  dueDate: string;
  providerNotes: string;
  eobSummary: string;
}

/**
 * Translate a full statement payload. Static phrases use the table;
 * dynamic prose routes through the provider. Returns a new object —
 * input is not mutated.
 */
export async function translateStatement(
  src: TranslatableStatement,
  targetLang: SupportedLanguage,
  provider: TranslationProvider,
): Promise<{
  labels: Record<StatementPhraseKey, string>;
  totals: TranslatableStatement["totals"];
  dueDate: string;
  providerNotes: string;
  eobSummary: string;
  rtl: boolean;
}> {
  const labels = Object.fromEntries(
    (Object.keys(STATIC_PHRASES) as StatementPhraseKey[]).map((k) => [k, phrase(k, targetLang)]),
  ) as Record<StatementPhraseKey, string>;

  const [providerNotes, eobSummary] = await Promise.all([
    provider.translate({
      text: src.providerNotes,
      targetLang,
      sourceLang: "en",
      domain: "billing-statement",
    }),
    provider.translate({
      text: src.eobSummary,
      targetLang,
      sourceLang: "en",
      domain: "eob-summary",
    }),
  ]);

  return {
    labels,
    totals: src.totals,
    dueDate: src.dueDate,
    providerNotes,
    eobSummary,
    rtl: isRtl(targetLang),
  };
}
