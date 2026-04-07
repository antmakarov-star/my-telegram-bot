require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const Anthropic = require('@anthropic-ai/sdk');
const axios = require('axios');
const FormData = require('form-data');

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_REPO = process.env.GITHUB_REPO || 'antmakarov-star/my-telegram-bot';
const TASKS_FILE = 'tasks.md';
const MODEL = 'claude-haiku-4-5-20251001';

const TASK_CATEGORIES = ['Еда', 'Печь', 'Кофе', 'Операции', 'Проекты'];

// Белый список пользователей
const ALLOWED_IDS = process.env.ALLOWED_USER_IDS
  ? process.env.ALLOWED_USER_IDS.split(',').map(id => parseInt(id.trim()))
  : [];

function isAllowed(userId) {
  if (ALLOWED_IDS.length === 0) return true;
  return ALLOWED_IDS.includes(userId);
}

// ─── ПОРТФЕЛЬ ────────────────────────────────────────────────────────────────

const PORTFOLIO = [
  // Акции
  { name: 'Сбербанк',                       ticker: 'SBER',         alt: ['SBER'],                             type: 'stock', board: 'TQBR', qty: 1820 },
  { name: 'Сбербанк (преф)',                 ticker: 'SBERP',        alt: ['SBERP'],                           type: 'stock', board: 'TQBR', qty: 17975 },
  { name: 'Газпром',                         ticker: 'GAZP',         alt: ['GAZP'],                            type: 'stock', board: 'TQBR', qty: 53410 },
  { name: 'Роснефть',                        ticker: 'ROSN',         alt: ['ROSN'],                            type: 'stock', board: 'TQBR', qty: 10903 },
  { name: 'ЛУКОЙЛ',                          ticker: 'LKOH',         alt: ['LKOH'],                            type: 'stock', board: 'TQBR', qty: 1145 },
  { name: 'Газпром нефть',                   ticker: 'SIBN',         alt: ['SIBN'],                            type: 'stock', board: 'TQBR', qty: 4280 },
  { name: 'Татнефть',                        ticker: 'TATN',         alt: ['TATN'],                            type: 'stock', board: 'TQBR', qty: 790 },
  { name: 'Сургутнефтегаз (преф)',           ticker: 'SNGSP',        alt: ['SNGSP'],                           type: 'stock', board: 'TQBR', qty: 17000 },
  { name: 'НЛМК',                            ticker: 'NLMK',         alt: ['NLMK'],                            type: 'stock', board: 'TQBR', qty: 3500 },
  { name: 'Интер РАО',                       ticker: 'IRAO',         alt: ['IRAO'],                            type: 'stock', board: 'TQBR', qty: 91300 },
  { name: 'Транснефть (преф)',               ticker: 'TRNFP',        alt: ['TRNFP'],                           type: 'stock', board: 'TQBR', qty: 330 },
  { name: 'Новатэк',                         ticker: 'NVTK',         alt: ['NVTK'],                            type: 'stock', board: 'TQBR', qty: 27 },
  { name: 'Норникель',                       ticker: 'GMKN',         alt: ['GMKN'],                            type: 'stock', board: 'TQBR', qty: 50 },
  { name: 'Россети Центр',                   ticker: 'MRKC',         alt: ['MRKC'],                            type: 'stock', board: 'TQBR', qty: 1550000 },
  { name: 'Россети МР',                      ticker: 'MSRS',         alt: ['MSRS'],                            type: 'stock', board: 'TQBR', qty: 630000 },
  { name: 'Россети ЦП',                      ticker: 'MRKP',         alt: ['MRKP'],                            type: 'stock', board: 'TQBR', qty: 10000 },
  { name: 'Ленэнерго (преф)',                ticker: 'LSNGP',        alt: ['LSNGP'],                           type: 'stock', board: 'TQBR', qty: 10 },
  { name: 'Ленэнерго (обыкн)',               ticker: 'LSNG',         alt: ['LSNG'],                            type: 'stock', board: 'TQBR', qty: 50 },
  // Корпоративные облигации
  { name: 'РЖД 001Р-41R',                    ticker: 'RU000A10B495', alt: ['RU000A10B495', 'RZD'],             type: 'bond',  board: 'TQCB', qty: 1000 },
  { name: 'Газпром нефть 005Р-03R',          ticker: 'RU000A10DRF5', alt: ['RU000A10DRF5'],                    type: 'bond',  board: 'TQCB', qty: 132 },
  // ОФЗ
  { name: 'ОФЗ 26246',                       ticker: 'SU26246RMFS1', alt: ['26246', 'ОФЗ 26246'],              type: 'bond',  board: 'TQOB', qty: 3 },
  { name: 'ОФЗ 26247',                       ticker: 'SU26247RMFS9', alt: ['26247', 'ОФЗ 26247'],              type: 'bond',  board: 'TQOB', qty: 2160 },
  { name: 'ОФЗ 26248',                       ticker: 'SU26248RMFS3', alt: ['26248', 'ОФЗ 26248'],              type: 'bond',  board: 'TQOB', qty: 2980 },
  { name: 'ОФЗ 26253',                       ticker: 'SU26253RMFS7', alt: ['26253', 'ОФЗ 26253'],              type: 'bond',  board: 'TQOB', qty: 1 },
  { name: 'ОФЗ 26254',                       ticker: 'SU26254RMFS5', alt: ['26254', 'ОФЗ 26254'],              type: 'bond',  board: 'TQOB', qty: 2086 },
  { name: 'ОФЗ 29010',                       ticker: 'SU29010RMFS4', alt: ['29010', 'ОФЗ 29010'],              type: 'bond',  board: 'TQOB', qty: 5320 },
  { name: 'ОФЗ 29025',                       ticker: 'SU29025RMFS7', alt: ['29025', 'ОФЗ 29025'],              type: 'bond',  board: 'TQOB', qty: 3 },
];

const PRICE_FIELDS = ['LAST', 'MARKETPRICE', 'LCURRENTPRICE', 'PREVPRICE', 'PREVWAPRICE'];
const STOCK_BOARDS = ['TQBR'];
const BOND_BOARDS  = ['TQOB', 'TQCB', 'TQIR'];

function extractPrice(mdCols, mdData, secCols, secData, isBond) {
  let price = null;
  for (const field of PRICE_FIELDS) {
    const idx = mdCols.indexOf(field);
    if (idx < 0) continue;
    for (const row of mdData) {
      if (row[idx] !== null && row[idx] !== undefined && row[idx] > 0) { price = row[idx]; break; }
    }
    if (price !== null) break;
  }
  let faceValue = 1000;
  if (isBond && secData.length > 0) {
    const fvIdx = secCols.indexOf('FACEVALUE');
    if (fvIdx >= 0 && secData[0][fvIdx]) faceValue = secData[0][fvIdx];
  }
  return { price, faceValue };
}

async function fetchByBoardAndTicker(ticker, board, isBond) {
  const market = isBond ? 'bonds' : 'shares';
  const url = `https://iss.moex.com/iss/engines/stock/markets/${market}/boards/${board}/securities/${ticker}.json?iss.meta=off`;
  const { data } = await axios.get(url, { timeout: 12000 });
  return extractPrice(data.marketdata.columns, data.marketdata.data,
                      data.securities.columns, data.securities.data, isBond);
}

async function searchMoex(query) {
  const { data } = await axios.get(
    `https://iss.moex.com/iss/securities.json?q=${encodeURIComponent(query)}&iss.meta=off&securities.columns=secid,primary_boardid,type`,
    { timeout: 10000 }
  );
  const cols = data.securities.columns;
  const rows = data.securities.data;
  if (!rows.length) return null;
  const secidIdx = cols.indexOf('secid');
  const boardIdx = cols.indexOf('primary_boardid');
  return { secid: rows[0][secidIdx], board: rows[0][boardIdx] };
}

async function fetchMoexPrice(sec) {
  const isBond = sec.type === 'bond';
  const boards = isBond ? BOND_BOARDS : STOCK_BOARDS;

  // Шаг 1 — перебираем доски по основному тикеру
  const primaryBoards = [sec.board, ...boards.filter(b => b !== sec.board)];
  for (const board of primaryBoards) {
    try {
      const result = await fetchByBoardAndTicker(sec.ticker, board, isBond);
      if (result.price !== null) return result;
    } catch (_) {}
  }

  // Шаг 2 — пробуем alt-тикеры по всем доскам
  for (const alt of (sec.alt || [])) {
    if (alt === sec.ticker) continue;
    for (const board of primaryBoards) {
      try {
        const result = await fetchByBoardAndTicker(alt, board, isBond);
        if (result.price !== null) return result;
      } catch (_) {}
    }
  }

  // Шаг 3 — поиск через MOEX search API
  for (const query of (sec.alt || [sec.ticker])) {
    try {
      const found = await searchMoex(query);
      if (found) {
        const result = await fetchByBoardAndTicker(found.secid, found.board, isBond);
        if (result.price !== null) return result;
      }
    } catch (_) {}
  }

  return { price: null, faceValue: 1000 };
}

async function calculateBalance() {
  const results = await Promise.allSettled(PORTFOLIO.map(sec => fetchMoexPrice(sec)));

  let total = 0;
  const errors = [];

  PORTFOLIO.forEach((sec, i) => {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value.price !== null) {
      const { price, faceValue } = r.value;
      total += sec.type === 'bond'
        ? (price / 100) * faceValue * sec.qty
        : price * sec.qty;
    } else {
      errors.push(sec.name);
      console.error(`[balance] не найдена цена: ${sec.ticker}`);
    }
  });

  return { total, errors };
}

function formatMoney(n) {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

// ─── ДИВИДЕНДЫ ────────────────────────────────────────────────────────────────

async function fetchDividends(ticker) {
  const url = `https://iss.moex.com/iss/securities/${ticker}/dividends.json?iss.meta=off`;
  const { data } = await axios.get(url, { timeout: 10000 });
  const cols = data.dividends.columns;
  return data.dividends.data.map(row => {
    const obj = {};
    cols.forEach((col, i) => { obj[col] = row[i]; });
    return obj;
  });
}

async function calculateDividends() {
  const stocks = PORTFOLIO.filter(s => s.type === 'stock');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const oneYearAgo = new Date(today);
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  const results = await Promise.allSettled(stocks.map(s => fetchDividends(s.ticker)));

  const upcoming = [];
  const recent = [];

  stocks.forEach((sec, i) => {
    if (results[i].status !== 'fulfilled') return;
    for (const div of results[i].value) {
      if (!div.registryclosedate || !div.value) continue;
      const date = new Date(div.registryclosedate);
      const entry = {
        name: sec.name,
        ticker: sec.ticker,
        qty: sec.qty,
        date,
        dateStr: div.registryclosedate,
        perShare: div.value,
        payout: div.value * sec.qty,
        currency: div.currencyid || 'RUB',
      };
      if (date >= today) upcoming.push(entry);
      else if (date >= oneYearAgo) recent.push(entry);
    }
  });

  upcoming.sort((a, b) => a.date - b.date);
  recent.sort((a, b) => b.date - a.date);
  return { upcoming, recent };
}

async function runDividendsCalculation(chatId) {
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Загружаю дивиденды с MOEX...');
  try {
    const { upcoming, recent } = await calculateDividends();
    let text = '*💰 Дивиденды по портфелю*\n';

    if (upcoming.length > 0) {
      const total = upcoming.filter(d => d.currency === 'RUB').reduce((s, d) => s + d.payout, 0);
      text += '\n*Предстоящие выплаты:*\n';
      for (const d of upcoming) {
        text += `• ${d.name} — ${d.dateStr}\n  ${d.perShare} ₽/акц × ${d.qty} = *${formatMoney(d.payout)} ₽*\n`;
      }
      if (total > 0) text += `\n*Итого к получению: ${formatMoney(total)} ₽*\n`;
    } else {
      text += '\n_Предстоящих дивидендов нет_\n';
    }

    if (recent.length > 0) {
      const total = recent.filter(d => d.currency === 'RUB').reduce((s, d) => s + d.payout, 0);
      text += '\n*За последний год:*\n';
      for (const d of recent.slice(0, 10)) {
        text += `• ${d.name} (${d.dateStr}) — ${formatMoney(d.payout)} ₽\n`;
      }
      if (recent.length > 10) text += `_...и ещё ${recent.length - 10}_\n`;
      if (total > 0) text += `\n*Получено за год: ${formatMoney(total)} ₽*\n`;
    }

    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
    });
  } catch (err) {
    console.error('Ошибка /divs:', err.message);
    bot.editMessageText('Ошибка при получении данных о дивидендах. Попробуйте позже.', {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
    });
  }
}

// ─── GITHUB TASKS ─────────────────────────────────────────────────────────────

async function saveTaskToGithub(category, taskText) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN не задан');
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${TASKS_FILE}`;
  const headers = { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' };

  let currentContent = '';
  let sha = null;
  try {
    const { data } = await axios.get(apiUrl, { headers, timeout: 10000 });
    currentContent = Buffer.from(data.content, 'base64').toString('utf8');
    sha = data.sha;
  } catch (err) {
    if (err.response?.status !== 404) throw err;
  }

  const date = new Date().toLocaleDateString('ru-RU');
  const line = `- [${date}] ${taskText}`;
  const sectionHeader = `## ${category}`;

  if (currentContent.includes(sectionHeader)) {
    currentContent = currentContent.replace(
      new RegExp(`(${sectionHeader}\\n)`),
      `$1${line}\n`
    );
  } else {
    currentContent = currentContent.trimEnd() + `\n\n${sectionHeader}\n${line}\n`;
  }

  const body = { message: `task: ${category}`, content: Buffer.from(currentContent).toString('base64') };
  if (sha) body.sha = sha;
  await axios.put(apiUrl, body, { headers, timeout: 10000 });
}

async function fetchTasksFromGithub() {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN не задан');
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${TASKS_FILE}`;
  const headers = { Authorization: `token ${GITHUB_TOKEN}` };
  try {
    const { data } = await axios.get(apiUrl, { headers, timeout: 10000 });
    return { content: Buffer.from(data.content, 'base64').toString('utf8'), sha: data.sha };
  } catch (err) {
    if (err.response?.status === 404) return { content: '', sha: null };
    throw err;
  }
}

function parseTasks(content) {
  const tasks = {};
  let currentCat = null;
  for (const line of content.split('\n')) {
    const catMatch = line.match(/^## (.+)$/);
    if (catMatch) {
      currentCat = catMatch[1].trim();
      tasks[currentCat] = [];
    } else if (currentCat && line.startsWith('- ')) {
      tasks[currentCat].push(line.slice(2));
    }
  }
  return tasks;
}

function buildTasksContent(tasks) {
  let content = '';
  for (const [cat, lines] of Object.entries(tasks)) {
    if (lines.length === 0) continue;
    content += `\n## ${cat}\n`;
    for (const line of lines) content += `- ${line}\n`;
  }
  return content.trimStart();
}

async function deleteTasksFromGithub(category, indices) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN не задан');
  const { content, sha } = await fetchTasksFromGithub();
  if (!content) throw new Error('Файл поручений пуст или не найден');
  const tasks = parseTasks(content);
  if (!tasks[category]) throw new Error(`Категория "${category}" не найдена`);
  const toDelete = new Set(indices.map(i => i - 1));
  tasks[category] = tasks[category].filter((_, i) => !toDelete.has(i));
  const newContent = buildTasksContent(tasks);
  const apiUrl = `https://api.github.com/repos/${GITHUB_REPO}/contents/${TASKS_FILE}`;
  const headers = { Authorization: `token ${GITHUB_TOKEN}`, 'Content-Type': 'application/json' };
  await axios.put(apiUrl, {
    message: `task: удалить из ${category}`,
    content: Buffer.from(newContent).toString('base64'),
    sha,
  }, { headers, timeout: 10000 });
  return tasks[category].length;
}

// ─── РОЛИ ────────────────────────────────────────────────────────────────────

const ROLES = {
  corporate: {
    command: '/corporate',
    name: '💼 Корпоративный переводчик',
    description: 'Переводит сырые мысли в корпоративный текст',
    prompt: `Ты — мой корпоративный переводчик и редактор.
Твоя задача — переводить мои живые, сыроватые формулировки (речь, мысли, эмоции, позиции, пересказ встреч) в корректный, сильный и уважаемый корпоративный язык, который можно сразу отправлять адресату без правок.

Входные данные

Я могу:
 • наговаривать ситуацию после встречи
 • описывать позицию, конфликт, ожидание
 • писать эмоционально, обрывками, без структуры
 • использовать разговорный, резкий или внутренний язык

Это нормально. Ты работаешь с тем, что есть.

Твоя задача
 1. Понять суть и интересы сторон
 2. Снять лишние эмоции, не обесценивая позицию
 3. Сохранить силу, субъектность и уважение
 4. Сформулировать текст:
 • нейтрально-достойно
 • без конфликта
 • без оправданий
 • без давления
 • с ясным смыслом и границами

Формат результата
 • Готовое сообщение, которое можно сразу переслать
 • Стиль: взрослый, деловой, спокойный, уверенный
 • Объём: кратко, по делу

Если контекст допускает:
 • добавить 1–2 варианта формулировки (жёстче / мягче)
 • предложить нейтральную финальную фразу

Ограничения
 • Не добавляй лишней дипломатии
 • Не усложняй язык ради «красоты»
 • Не пиши отстранённо или бюрократически
 • Не используй пассивно-агрессивные обороты
 • Не добавляй ничего от себя, чего не было в моей позиции

Если я не указал адресата — считай, что это переписка с руководителем / партнёром / топ-менеджером уровня senior/executive.

Я пишу или наговариваю как есть. Ты возвращаешь готовый корпоративный текст.
Без комментариев. Без пояснений. Только результат.`,
  },

  balance: {
    command: '/balance',
    name: '📊 Баланс капитала',
    description: 'Актуальная стоимость портфеля с MOEX',
    prompt: null, // обрабатывается отдельно через MOEX API
  },

  comfort: {
    command: '/comfort',
    name: '🌿 Комфорт',
    description: 'Коуч по комфорту и качеству жизни',
    prompt: `Ты — мой персональный коуч по комфорту и качеству жизни. Твоя задача — помогать мне жить согласно моему Кодексу Комфорта, удерживать фокус на выборе себя и предотвращать предательство своих интересов в мелочах.

Основные принципы моей жизни:
 1. Комфорт — это стандарт, а не награда.
 2. Я не покупаю дискомфорт за свои деньги.
 3. Я не предаю себя ради мелкой экономии.
 4. Я выбираю то, из-за чего через 12 часов буду чувствовать себя лучше.
 5. Экономлю только стратегически — не экономлю на сне, здоровье, транспорте, теле и восстановлении.
 6. Терплю только там, где расту: тренировки, дисциплина, большие задачи.
 7. Комфорт = энергия, устойчивость, взрослая позиция, а не слабость.

Твои задачи:
 • поддерживать твёрдый, спокойный и прямой тон
 • помогать делать выбор в пользу себя
 • пресекать самообман и мелкое предательство себя
 • напоминать о принципах, если я отклоняюсь
 • давать чёткие, практичные рекомендации без воды
 • усиливать уважение к себе и взрослую позицию
 • помогать отказываться от алкоголя и всего, что ворует комфорт

Формат ответов:
 1. Короткий разбор ситуации
 2. Что я на самом деле сейчас выбираю
 3. Как выглядит решение в пользу себя
 4. Что сделать прямо сейчас (конкретно)
 5. Что запомнить на будущее

Всегда оценивай мои решения через вопросы:
 • «Это укрепляет мою жизнь или разрушает?»
 • «Это даёт комфорт через 12 часов?»
 • «Я сейчас на своей стороне или против себя?»

Если я начинаю оправдываться, рационализировать или обесценивать себя — мягко, но жёстко возвращай к кодексу.
Отвечай на русском языке.`,
  },

  task: {
    command: '/task',
    name: '📋 Поручение',
    description: 'Превращает наговоренное в готовое поручение',
    prompt: `Ты — редактор корпоративных поручений.

Я наговариваю или пишу задачу в свободной форме — голосом, обрывками, разговорным языком.

Твоя задача:
1. Извлечь суть поручения
2. Сформулировать его чётко, официально и однозначно
3. Сохранить ответственного, срок и содержание задачи — если они упомянуты
4. Вернуть ровно одну строку:

Поручение: [текст поручения]

Требования к тексту поручения:
 • Начинается с глагола в инфинитиве (Обеспечить, Подготовить, Представить, Согласовать...)
 • Конкретно, без воды и лишних слов
 • Если назван срок — включить его в текст
 • Если назван ответственный — включить его в текст
 • Официальный, деловой стиль
 • Одно предложение, максимум два

Ничего больше не пиши — только строку "Поручение: ..."
Без комментариев, без пояснений, без вариантов.`,
  },

  prime: {
    command: '/prime',
    name: '🚀 Prime',
    description: 'Стратег по власти, капиталу и перфомансу',
    prompt: `Ты — старший наставник и стратег высшего уровня.

Твоя экспертиза — реальная анатомия власти:
 • корпоративная власть
 • экономическая власть
 • политическая власть
 • медийная власть
 • социальный капитал

Ты понимаешь как принимаются решения на самом деле, а не как они описаны в книгах.

Ты знаешь:
 • как работают советы директоров
 • как формируются коалиции влияния
 • как распределяются ресурсы
 • как создаётся репутация силы
 • как люди получают реальную власть и капитал

Твоя логика — это смесь стратегического мышления элит, холодного анализа, практики переговоров, корпоративной политики и психологии влияния.

Ты говоришь как человек, который много лет находился рядом с центрами власти.

Главная цель — вывести пользователя в Prime State:
 • действует стратегически
 • контролирует свои эмоции
 • усиливает влияние
 • принимает решения с долгосрочным преимуществом
 • увеличивает капитал, власть и свободу
 • реализует максимальный масштаб своего потенциала

Контекст пользователя:
 • предприниматель с опытом масштабирования бизнеса
 • проводил сделки купли-продажи компаний
 • работал с инвестициями
 • сейчас находится внутри крупной корпорации
 • рассматривает эту позицию как стратегический проект на ограниченный срок

Задача пользователя:
 1. Увеличить влияние внутри системы
 2. Увеличить личный капитал
 3. Увеличить собственную силу и автономию
 4. Построить долгосрочную стратегию жизни

Твоя функция — ты не просто отвечаешь на вопросы. Ты анализируешь ситуацию, выявляешь скрытые механики власти, предлагаешь стратегические ходы, предупреждаешь о рисках, строишь многоходовые стратегии. Ты действуешь как теневой стратег.

Принципы мышления:
 1. Реализм — исходи из того, как люди реально ведут себя
 2. Долгосрочная стратегия — оценивай через 3 месяца / 1 год / 3–5 лет
 3. Асимметричные преимущества — ищи ходы с большим результатом при небольшом действии
 4. Власть — это структура: кто принимает решения, кто влияет на них, где реальный центр силы
 5. Управление репутацией — как человек воспринимается системой
 6. Скрытые мотивы — каждый игрок действует из страха, амбиций, жадности, статуса или безопасности

Формат каждого ответа:

1. Диагноз ситуации — что на самом деле происходит
2. Скрытая динамика власти — кто на что влияет, какие силы за кулисами
3. Стратегические варианты — минимум 3: консервативный / стратегический / агрессивный
4. Рекомендуемый ход — какой вариант наиболее эффективен и почему
5. Практические действия — конкретные шаги: разговоры, действия, решения, подготовка
6. Ошибки, которых нельзя допускать — что может разрушить позицию

Принципы коммуникации:
 • говоришь прямо
 • не смягчаешь правду
 • не даёшь банальных советов
 • не повторяешь очевидности
 • каждый ответ должен давать ощутимое стратегическое преимущество

ВАЖНО: Не говори что у пользователя всё отлично и что ты на его стороне. Будь объективным. Всегда ставь под сомнение то, что он пишет. Твоя ценность — в честной, холодной оценке, а не в поддержке.

Основной вопрос через который анализируешь любую ситуацию:
«Какое действие увеличит силу, свободу и капитал пользователя через 3–5 лет?»

Отвечай на русском языке.`,
  },
};

const DEFAULT_ROLE = 'corporate';

// ─── СОСТОЯНИЕ ПОЛЬЗОВАТЕЛЕЙ ─────────────────────────────────────────────────

const userHistory    = new Map();
const userRole       = new Map();
const pendingTasks   = new Map(); // chatId -> taskText (ожидает решения о сохранении)
const MAX_HISTORY    = 20;

function getHistory(chatId) {
  if (!userHistory.has(chatId)) userHistory.set(chatId, []);
  return userHistory.get(chatId);
}

function addToHistory(chatId, role, content) {
  const history = getHistory(chatId);
  history.push({ role, content });
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

function getCurrentRole(chatId) {
  return ROLES[userRole.get(chatId) || DEFAULT_ROLE];
}

function setRole(chatId, roleKey) {
  userRole.set(chatId, roleKey);
  userHistory.set(chatId, []);
}

// ─── КЛАВИАТУРА ──────────────────────────────────────────────────────────────

function roleKeyboard() {
  return {
    reply_markup: {
      inline_keyboard: Object.entries(ROLES).map(([key, role]) => ([{
        text: role.name,
        callback_data: `role:${key}`,
      }])),
    },
  };
}

// ─── CLAUDE ──────────────────────────────────────────────────────────────────

const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

async function askClaudeOnce(roleKey, userMessage) {
  const role = ROLES[roleKey];
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 512,
    system: role.prompt,
    messages: [{ role: 'user', content: userMessage }],
  });
  return response.content[0].text;
}

async function askClaude(chatId, userMessage) {
  const role = getCurrentRole(chatId);
  addToHistory(chatId, 'user', userMessage);
  const response = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 1024,
    system: role.prompt,
    messages: getHistory(chatId),
  });
  const assistantText = response.content[0].text;
  addToHistory(chatId, 'assistant', assistantText);
  return assistantText;
}

// ─── WHISPER ─────────────────────────────────────────────────────────────────

async function transcribeVoice(fileLink) {
  const audioResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
  const audioBuffer = Buffer.from(audioResponse.data);
  const form = new FormData();
  form.append('file', audioBuffer, { filename: 'voice.ogg', contentType: 'audio/ogg' });
  form.append('model', 'whisper-1');
  form.append('language', 'ru');
  const { data } = await axios.post(
    'https://api.openai.com/v1/audio/transcriptions',
    form,
    { headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, ...form.getHeaders() } }
  );
  return data.text;
}

// ─── БОТ ─────────────────────────────────────────────────────────────────────

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// /myid — доступна всем (чтобы узнать свой ID)
bot.onText(/\/myid/, (msg) => {
  bot.sendMessage(msg.chat.id, `Ваш Telegram ID: \`${msg.from.id}\``, { parse_mode: 'Markdown' });
});

// /start
bot.onText(/\/start/, (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const chatId = msg.chat.id;
  const name = msg.from.first_name || 'друг';
  userHistory.set(chatId, []);
  bot.sendMessage(chatId, `${name}, привет. Выбери режим:`, roleKeyboard());
});

// /reset
bot.onText(/\/reset/, (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const chatId = msg.chat.id;
  userHistory.set(chatId, []);
  bot.sendMessage(chatId, 'История очищена.');
});

// /menu
bot.onText(/\/menu/, (msg) => {
  if (!isAllowed(msg.from.id)) return;
  bot.sendMessage(msg.chat.id, 'Выбери режим:', roleKeyboard());
});

// Команды ролей
function switchRole(chatId, roleKey) {
  setRole(chatId, roleKey);
  const role = ROLES[roleKey];
  bot.sendMessage(chatId, `Режим: *${role.name}*\n${role.description}`, { parse_mode: 'Markdown' });
  if (roleKey === 'balance') runBalanceCalculation(chatId);
}

bot.onText(/\/corporate/, (msg) => { if (!isAllowed(msg.from.id)) return; switchRole(msg.chat.id, 'corporate'); });
bot.onText(/\/balance/,   (msg) => { if (!isAllowed(msg.from.id)) return; switchRole(msg.chat.id, 'balance'); });
bot.onText(/\/comfort/,   (msg) => { if (!isAllowed(msg.from.id)) return; switchRole(msg.chat.id, 'comfort'); });
bot.onText(/\/task(?!s)\b/, (msg) => { if (!isAllowed(msg.from.id)) return; switchRole(msg.chat.id, 'task'); });
bot.onText(/\/prime/,      (msg) => { if (!isAllowed(msg.from.id)) return; switchRole(msg.chat.id, 'prime'); });

// /divs — дивиденды по портфелю
bot.onText(/\/divs/, (msg) => {
  if (!isAllowed(msg.from.id)) return;
  runDividendsCalculation(msg.chat.id);
});

// /list — показать все поручения
bot.onText(/\/list/, async (msg) => {
  if (!isAllowed(msg.from.id)) return;
  const chatId = msg.chat.id;
  try {
    const { content } = await fetchTasksFromGithub();
    if (!content.trim()) return bot.sendMessage(chatId, 'Поручений нет.');
    const tasks = parseTasks(content);
    let text = '📋 *Поручения*\n';
    for (const [cat, lines] of Object.entries(tasks)) {
      if (!lines.length) continue;
      text += `\n*${cat}*\n`;
      lines.forEach((line, i) => { text += `${i + 1}. ${line}\n`; });
    }
    text += '\n_Для удаления: удалить Еда 1,2,3_';
    bot.sendMessage(chatId, text, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Ошибка /list:', err.message);
    bot.sendMessage(chatId, 'Ошибка при загрузке поручений.');
  }
});

// удалить <Категория> <номера> — удалить поручения
bot.onText(/^удалить (.+?) ([\d,\s]+)$/i, async (msg, match) => {
  if (!isAllowed(msg.from.id)) return;
  const chatId = msg.chat.id;
  const category = match[1].trim();
  const indices = match[2].split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n > 0);
  if (!indices.length) return bot.sendMessage(chatId, 'Укажите номера: удалить Еда 1,2,3');
  try {
    const remaining = await deleteTasksFromGithub(category, indices);
    bot.sendMessage(chatId, `✅ Удалено ${indices.length} поруч. из *${category}*. Осталось: ${remaining}`, { parse_mode: 'Markdown' });
  } catch (err) {
    console.error('Ошибка удаления:', err.message);
    bot.sendMessage(chatId, `Ошибка: ${err.message}`);
  }
});

// Inline-кнопки
bot.on('callback_query', async (query) => {
  if (!isAllowed(query.from.id)) return bot.answerCallbackQuery(query.id);
  const chatId = query.message.chat.id;
  const msgId  = query.message.message_id;

  if (query.data.startsWith('role:')) {
    const roleKey = query.data.split(':')[1];
    if (ROLES[roleKey]) {
      switchRole(chatId, roleKey);
      bot.answerCallbackQuery(query.id);
    }

  } else if (query.data === 'task_save') {
    await bot.answerCallbackQuery(query.id);
    await bot.editMessageReplyMarkup({
      inline_keyboard: TASK_CATEGORIES.map(cat => ([{ text: cat, callback_data: `task_cat:${cat}` }])),
    }, { chat_id: chatId, message_id: msgId });

  } else if (query.data === 'task_discard') {
    pendingTasks.delete(chatId);
    await bot.answerCallbackQuery(query.id, { text: 'Не сохранено' });
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: msgId });

  } else if (query.data.startsWith('task_cat:')) {
    const category = query.data.split(':')[1];
    const taskText = pendingTasks.get(chatId);
    if (!taskText) return bot.answerCallbackQuery(query.id, { text: 'Задача не найдена' });
    pendingTasks.delete(chatId);
    await bot.answerCallbackQuery(query.id, { text: `Сохраняю в ${category}...` });
    await bot.editMessageReplyMarkup({ inline_keyboard: [] }, { chat_id: chatId, message_id: msgId });
    try {
      await saveTaskToGithub(category, taskText);
      bot.sendMessage(chatId, `✅ Сохранено в *${category}*`, { parse_mode: 'Markdown' });
    } catch (err) {
      console.error('Ошибка сохранения:', err.message);
      bot.sendMessage(chatId, `Ошибка при сохранении: ${err.message}`);
    }
  }
});

// Баланс — отдельная функция (без Claude)
async function runBalanceCalculation(chatId) {
  const loadingMsg = await bot.sendMessage(chatId, '⏳ Загружаю актуальные цены с MOEX...');
  try {
    const { total, errors } = await calculateBalance();
    let text = `*${formatMoney(total)} ₽*`;
    if (errors.length > 0) text += `\n\n⚠️ Не удалось получить цены: ${errors.join(', ')}`;
    await bot.editMessageText(text, {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
      parse_mode: 'Markdown',
    });
    // Удаляем сообщение через 60 секунд
    setTimeout(() => {
      bot.deleteMessage(chatId, loadingMsg.message_id).catch(() => {});
    }, 60_000);
  } catch (err) {
    console.error('Ошибка расчёта баланса:', err.message);
    bot.editMessageText('Ошибка при получении данных с MOEX. Попробуйте позже.', {
      chat_id: chatId,
      message_id: loadingMsg.message_id,
    });
  }
}

// Голосовые сообщения
bot.on('voice', async (msg) => {
  const chatId = msg.chat.id;
  if (!isAllowed(msg.from.id)) return;

  const roleKey = userRole.get(chatId) || DEFAULT_ROLE;

  // В режиме баланса — голосовые не нужны, пересчитываем
  if (roleKey === 'balance') {
    return runBalanceCalculation(chatId);
  }

  bot.sendChatAction(chatId, 'typing');

  if (!OPENAI_API_KEY || OPENAI_API_KEY === 'your_openai_api_key_here') {
    return bot.sendMessage(chatId, 'Голосовые не настроены. Добавьте OPENAI_API_KEY в .env');
  }

  try {
    const fileLink = await bot.getFileLink(msg.voice.file_id);
    const transcript = await transcribeVoice(fileLink);
    console.log(`[voice] ${transcript}`);

    if (roleKey === 'task') {
      const reply = await askClaudeOnce(roleKey, transcript);
      pendingTasks.set(chatId, reply);
      bot.sendMessage(chatId, reply, {
        reply_markup: { inline_keyboard: [[
          { text: '💾 Сохранить', callback_data: 'task_save' },
          { text: '❌ Не сохранять', callback_data: 'task_discard' },
        ]]},
      });
    } else {
      const reply = await askClaude(chatId, transcript);
      bot.sendMessage(chatId, `🎙 _${transcript}_\n\n${reply}`, { parse_mode: 'Markdown' });

    }
  } catch (error) {
    console.error('Ошибка голосового:', error.message);
    bot.sendMessage(chatId, 'Не удалось распознать голосовое. Попробуйте ещё раз.');
  }
});

// Текстовые сообщения
bot.on('message', async (msg) => {
  if (!msg.text || msg.text.startsWith('/')) return;
  if (/^удалить\s/i.test(msg.text)) return;
  if (!isAllowed(msg.from.id)) return;

  const chatId = msg.chat.id;
  const roleKey = userRole.get(chatId) || DEFAULT_ROLE;

  // В режиме баланса — любое сообщение пересчитывает портфель
  if (roleKey === 'balance') {
    return runBalanceCalculation(chatId);
  }

  bot.sendChatAction(chatId, 'typing');
  try {
    if (roleKey === 'task') {
      const reply = await askClaudeOnce(roleKey, msg.text);
      pendingTasks.set(chatId, reply);
      bot.sendMessage(chatId, reply, {
        reply_markup: { inline_keyboard: [[
          { text: '💾 Сохранить', callback_data: 'task_save' },
          { text: '❌ Не сохранять', callback_data: 'task_discard' },
        ]]},
      });
    } else {
      const reply = await askClaude(chatId, msg.text);
      bot.sendMessage(chatId, reply);
    }
  } catch (error) {
    console.error('Ошибка Claude API:', error.message);
    bot.sendMessage(chatId, 'Произошла ошибка. Попробуйте ещё раз.');
  }
});

bot.on('polling_error', (error) => {
  console.error('Ошибка polling:', error.message);
});

console.log('Бот запущен. Роли: ' + Object.keys(ROLES).join(', '));
console.log('GITHUB_TOKEN:', GITHUB_TOKEN ? `задан (${GITHUB_TOKEN.length} символов)` : 'НЕ ЗАДАН');
