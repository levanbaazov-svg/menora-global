// Russian transliterations of Torah portions (parshiyot) and Jewish holidays.
// Following common Russian-Jewish publishing conventions (Гутник, Sefaria-ru).

import 'server-only';

export const PARSHA_RU: Record<string, string> = {
  // Bereshit
  Bereshit: 'Берешит',
  Noach: 'Ноах',
  'Lech-Lecha': 'Лех-Леха',
  "Lech L'cha": 'Лех-Леха',
  Vayera: 'Вайера',
  'Chayei Sara': 'Хайей Сара',
  Toldot: 'Толдот',
  Vayetzei: 'Вайеце',
  Vayishlach: 'Ваишлах',
  Vayeshev: 'Вайешев',
  Miketz: 'Микец',
  Vayigash: 'Ваигаш',
  Vayechi: 'Ваехи',

  // Shemot
  Shemot: 'Шмот',
  Vaera: 'Ваэра',
  "Va'era": 'Ваэра',
  Bo: 'Бо',
  Beshalach: 'Бешалах',
  Yitro: 'Итро',
  Mishpatim: 'Мишпатим',
  Terumah: 'Трума',
  Tetzaveh: 'Тецаве',
  'Ki Tisa': 'Ки Тиса',
  Vayakhel: 'Ваякхель',
  Pekudei: 'Пкудей',
  'Vayakhel-Pekudei': 'Ваякхель-Пкудей',

  // Vayikra
  Vayikra: 'Ваикра',
  Tzav: 'Цав',
  Shmini: 'Шмини',
  Tazria: 'Тазриа',
  Metzora: 'Мецора',
  'Tazria-Metzora': 'Тазриа-Мецора',
  'Achrei Mot': 'Ахарей Мот',
  Kedoshim: 'Кдошим',
  'Achrei Mot-Kedoshim': 'Ахарей Мот-Кдошим',
  Emor: 'Эмор',
  Behar: 'Бэhар',
  Bechukotai: 'Бэхукотай',
  'Behar-Bechukotai': 'Бэhар-Бэхукотай',

  // Bamidbar
  Bamidbar: 'Бамидбар',
  Nasso: 'Насо',
  Beha: 'Бэhаалотха', // hebcal sometimes truncates
  "Beha'alotcha": 'Бэhаалотха',
  'Sh’lach': 'Шлах',
  "Sh'lach": 'Шлах',
  Korach: 'Корах',
  Chukat: 'Хукат',
  Balak: 'Балак',
  'Chukat-Balak': 'Хукат-Балак',
  Pinchas: 'Пинхас',
  Matot: 'Матот',
  Masei: 'Масэй',
  'Matot-Masei': 'Матот-Масэй',

  // Devarim
  Devarim: 'Дварим',
  Vaetchanan: 'Ваэтханан',
  "Va'etchanan": 'Ваэтханан',
  Eikev: 'Экев',
  "Re'eh": 'Рээ',
  Shoftim: 'Шофтим',
  'Ki Teitzei': 'Ки Тэце',
  'Ki Tavo': 'Ки Таво',
  Nitzavim: 'Ницавим',
  Vayeilech: 'Ваелех',
  'Nitzavim-Vayeilech': 'Ницавим-Ваелех',
  "Ha'Azinu": 'hАазину',
  Haazinu: 'hАазину',
  "Vezot Haberachah": 'Везот hаБраха',
  "V'Zot HaBerachah": 'Везот hаБраха',
};

/** Holiday → Russian. Patterns first, then prefix-matched in translateHoliday(). */
export const HOLIDAY_RU: Record<string, string> = {
  // Tishrei
  'Rosh Hashana': 'Рош ха-Шана',
  'Rosh Hashana LaBehemot': 'Рош ха-Шана ла-Бэhэмот',
  'Tzom Gedaliah': 'Цом Гедалия',
  'Yom Kippur': 'Йом Кипур',
  Sukkot: 'Сукот',
  "Sh'mini Atzeret": 'Шмини Ацерет',
  "Simchat Torah": 'Симхат Тора',

  // Cheshvan / Kislev / Tevet
  Chanukah: 'Ханука',
  'Asara B’Tevet': 'Асара бэ-Тевет',
  "Asara B'Tevet": 'Асара бэ-Тевет',

  // Shevat
  'Tu BiShvat': 'Ту би-Шват',

  // Adar
  'Ta’anit Esther': 'Таанит Эстер',
  "Ta'anit Esther": 'Таанит Эстер',
  Purim: 'Пурим',
  'Shushan Purim': 'Шушан Пурим',
  'Purim Katan': 'Пурим Катан',

  // Nisan / Iyar
  Pesach: 'Песах',
  'Pesach Sheni': 'Песах Шени',
  'Yom HaShoah': 'Йом ха-Шоа',
  'Yom HaAliyah': 'Йом ха-Алия',
  'Yom HaZikaron': 'Йом ха-Зикарон',
  "Yom HaAtzma'ut": 'Йом ха-Ацмаут',
  'Yom Ha’Atzma’ut': 'Йом ха-Ацмаут',
  'Lag BaOmer': 'Лаг ба-Омер',
  'Yom Yerushalayim': 'Йом Йерушалаим',

  // Sivan
  Shavuot: 'Шавуот',

  // Tamuz / Av
  'Tzom Tammuz': 'Цом Таммуз',
  "Tish'a B'Av": 'Тиша бэ-Ав',
  'Tisha B’Av': 'Тиша бэ-Ав',
  "Tu B'Av": 'Ту бэ-Ав',
  'Tu B’Av': 'Ту бэ-Ав',
};

/** Match by prefix (e.g. "Chanukah: 1 Candle" → "Ханука: 1-я свеча"). */
export function translateHoliday(title: string): string {
  // Strip leading parashat marker if present (handled separately by translateParsha)
  // Try exact match first
  if (HOLIDAY_RU[title]) return HOLIDAY_RU[title];

  // Common patterns like "Sukkot III (CH''M)" → "Сукот III (хол ха-моэд)"
  for (const key of Object.keys(HOLIDAY_RU)) {
    if (title.startsWith(key)) {
      const suffix = title.slice(key.length);
      const ruSuffix = suffix
        .replace(/\(CH''M\)/g, '(хол ха-моэд)')
        .replace(/\(CH'M\)/g, '(хол ха-моэд)')
        .replace(/Candle/g, 'свеча')
        .replace(/Candles/g, 'свечей')
        .replace(/Day/g, 'день')
        .replace(/Erev/g, 'канун');
      return HOLIDAY_RU[key] + suffix.replace(/[A-Za-z]+/g, (m) =>
        m === 'CH' ? 'хол' : m === 'Candle' ? 'свеча' : m === 'Candles' ? 'свечей' : m === 'Day' ? 'день' : m === 'Erev' ? 'канун' : m,
      );
    }
  }
  // Fallback: return original
  return title;
}

export function translateParsha(name: string): string {
  // hebcal returns "Beha'alotcha" or "Parashat Beha'alotcha"
  const cleaned = name.replace(/^Parashat\s+/i, '').trim();
  return PARSHA_RU[cleaned] ?? cleaned;
}
