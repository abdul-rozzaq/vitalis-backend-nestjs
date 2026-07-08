export interface DefaultRowSeed {
  code?: string;
  indicator: string;
  norm?: string;
  unit?: string;
}

// ─── "Қоннинг умумий таҳлили" (умумий қон таҳлили) ────────────────────────
export const UMUMIY_QON_TAHLILI_ROWS: DefaultRowSeed[] = [
  { code: "WBC", indicator: "Лейкоцитлар сони", norm: "4.0-10.0", unit: "10⁹ г/л" },
  { code: "Neu#", indicator: "Нейтрофиллар сони", norm: "2.0-7.0", unit: "10⁹ г/л" },
  { code: "Lymph#", indicator: "Лимфоцитлар сони", norm: "0.8-4.0", unit: "10⁹ г/л" },
  { code: "Mon#", indicator: "Моноцитлар сони", norm: "0.1-1.5", unit: "10⁹ г/л" },
  { code: "Eos#", indicator: "Эозинофиллар сони", norm: "0.02-0.5", unit: "10⁹ г/л" },
  { code: "Bas#", indicator: "Базофиллар сони", norm: "0-0.08", unit: "10⁹ г/л" },
  { code: "Neu%", indicator: "Нейтрофиллар фоизи", norm: "42.0-72.0", unit: "%" },
  { code: "Lymph%", indicator: "Лимфоцитлар фоизи", norm: "19.0-37.0", unit: "%" },
  { code: "Mon%", indicator: "Моноцитлар фоизи", norm: "3.0-11.0", unit: "%" },
  { code: "Eos%", indicator: "Эозинофиллар фоизи", norm: "0.5-5", unit: "%" },
  { code: "Bas%", indicator: "Базофиллар фоизи", norm: "0.0-1.0", unit: "%" },
  { code: "RBC", indicator: "Эритроцитлар сони", norm: "4.0-5.50", unit: "10¹²/л" },
  { code: "HGB", indicator: "Гемоглобин", norm: "120-160", unit: "г/л" },
  { code: "HCT", indicator: "Гематокрит", norm: "40-54", unit: "%" },
  { code: "MCV", indicator: "Эритроцитлар ўртача ҳажми", norm: "80-100", unit: "мкм³" },
  { code: "MCH", indicator: "1 дона эритроцитдаги гемоглобин миқдори", norm: "27-34", unit: "пг" },
  { code: "MCHC", indicator: "Эритроцитдаги гемоглобин концентрацияси", norm: "320-360", unit: "г/л" },
  { code: "RDW-CV", indicator: "Эритроцитлар анизоцитози", norm: "11.0-16.0", unit: "%" },
  { code: "RDW-SD", indicator: "Эритроцитлар стандарт анизоцитози", norm: "35.0-56.0", unit: "мкм³" },
  { code: "PLT", indicator: "Тромбоцитлар сони", norm: "100-300", unit: "10⁹/л" },
  { code: "MPV", indicator: "Тромбоцитлар ўртача ҳажми", norm: "6.5-12.0", unit: "мкм³" },
  { code: "PDW", indicator: "Тромбоцитлар анизоцитози", norm: "15.0-17.0", unit: "%" },
  { code: "PCT", indicator: "Тромбокрит", norm: "0.108-0.282", unit: "%" },
  { code: "ЭЧТ", indicator: "Эритроцитлар чўкиш тезлиги", norm: "Эркак: 2-10, Аёл: 2-15", unit: "мм/соат" },
  { indicator: "Қоннинг ивиш вақти", norm: "3-5", unit: "минут" },
];

// ─── "Биокимёвий таҳлил натижалари" ────────────────────────────────────────
export const BIOKIMYOVIY_TAHLIL_ROWS: DefaultRowSeed[] = [
  { indicator: "Умумий оқсил", norm: "Катталарда: 66-87, Ҳомиладорларда: 61-69", unit: "г/л" },
  { indicator: "Глюкоза", norm: "4.2-6.4", unit: "ммоль/л" },
  { indicator: "Мочевина", norm: "1.7-8.3", unit: "ммоль/л" },
  { indicator: "Креатинин", norm: "Эркак: 62-115, Аёл: 44-97", unit: "мкмоль/л" },
  { indicator: "Билирубин (умумий)", norm: "Катталарда: 1.1-18.8, Чақалоқларда: 5.0-85.5", unit: "мкмоль/л" },
  { indicator: "Билирубин (боғланган)", norm: "0.25-4.3", unit: "мкмоль/л" },
  { indicator: "Билирубин (боғланмаган)", norm: "1.2-15.7", unit: "мкмоль/л" },
  { code: "АЛТ", indicator: "Аланинаминотрансфераза (АЛТ)", norm: "Эркак: 10-40, Аёл: 10-31", unit: "Ед/л" },
  { code: "АСТ", indicator: "Аспартатаминотрансфераза (АСТ)", norm: "Эркак: 10-40, Аёл: 10-31", unit: "Ед/л" },
  { indicator: "Кальций", norm: "2.0-2.6", unit: "ммоль/л" },
  { code: "СРБ", indicator: "С-реактив оқсил (СРБ)", norm: "манфий", unit: "мг/л" },
  { code: "РФ", indicator: "Ревматоид фактор (РФ)", norm: "манфий", unit: "Ед/мл" },
  { code: "АСЛО", indicator: "Антистрептолизин О (АСЛО)", norm: "манфий", unit: "Ед/мл" },
  { indicator: "HBsAg (гепатит В)", norm: "манфий" },
  { indicator: "Anti-HCV (гепатит С)", norm: "манфий" },
  { indicator: "Syphilis Ab (RW)", norm: "манфий" },
  { indicator: "HIV-anti 1/2", norm: "манфий" },
  { indicator: "Қон группаси, Резус фактор" },
];

// ─── "Коагулограмма таҳлил натижалари" ─────────────────────────────────────
export const KOAGULOGRAMMA_ROWS: DefaultRowSeed[] = [
  { code: "PT", indicator: "Протромбин вақти (PT)", norm: "11-15", unit: "сек" },
  { code: "PTI", indicator: "Протромбин индекси (PTI)", norm: "80-120", unit: "%" },
  { code: "INR", indicator: "Халқаро меъёрлаштирилган нисбат (INR)", norm: "0.8-1.2" },
  { indicator: "Фибриноген", norm: "2.0-4.0", unit: "г/л" },
  { code: "АЧТВ", indicator: "Активланган қисман тромбопластин вақти (АЧТВ)", norm: "25-35", unit: "сек" },
];