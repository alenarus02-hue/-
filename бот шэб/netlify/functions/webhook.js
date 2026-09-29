const https = require("https");

const BOT_TOKEN = "8695713031:AAFRqI4TaTkYm88OuRHieSKdwwZQBU7gyvc"; // Ваш токен от @BotFather
const CHANNEL_USERNAME = "@SchoolEmotionalBalance";
const MINI_APP_URL = "https://school-emo-balance.ru";
const PRE_CHAT_URL = "https://t.me/+R7CROx6JCx9lZGZi";
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxZBLqafeJZtGblEcNCuIeGsJ45FTbUuyW8PJqzz2uaJyzCpViAwqqZunmvakH90jVsdA/exec";

function callTg(method, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    const req = https.request({
      hostname: "api.telegram.org",
      path: `/bot${BOT_TOKEN}/${method}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload)
      }
    }, res => {
      let body = "";
      res.on("data", chunk => body += chunk);
      res.on("end", () => resolve(JSON.parse(body || "{}")));
    });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

function sendMessage(chatId, text, replyMarkup = null) {
  const data = {
    chat_id: chatId,
    text: text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if (replyMarkup) data.reply_markup = replyMarkup;
  return callTg("sendMessage", data);
}

function sendPhoto(chatId, photoUrl, caption, replyMarkup = null) {
  const data = {
    chat_id: chatId,
    photo: photoUrl,
    caption: caption,
    parse_mode: "HTML"
  };
  if (replyMarkup) data.reply_markup = replyMarkup;
  return callTg("sendPhoto", data);
}

async function checkSub(userId) {
  try {
    const res = await callTg("getChatMember", {
      chat_id: CHANNEL_USERNAME,
      user_id: userId
    });
    if (res && res.ok && res.result) {
      return ["creator", "administrator", "member"].includes(res.result.status);
    }
  } catch (e) {
    console.error("Sub check error:", e);
  }
  return false;
}

function logToGoogle(payload) {
  return new Promise((resolve) => {
    const postData = JSON.stringify(payload);
    const parsed = new URL(GOOGLE_SCRIPT_URL);
    const req = https.request({
      hostname: parsed.hostname,
      path: parsed.pathname + parsed.search,
      method: "POST",
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
        "Content-Length": Buffer.byteLength(postData)
      }
    }, () => resolve());
    req.on("error", () => resolve());
    req.write(postData);
    req.end();
  });
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 200, body: "Webhook Active" };
  }

  try {
    const body = JSON.parse(event.body || "{}");

    // 1. ВЕБХУК ИЗ ТИЛЬДЫ: РЕГИСТРАЦИЯ В MINI APP (0.3)
    if (body.action === "registered" && body.tg_id) {
      const chatId = body.tg_id;
      await sendPhoto(
        chatId,
        "https://optim.tildacdn.com/tild6665-3735-4736-b561-333438363139/-/format/webp/tatiana.jpg.webp",
        `Всё, регистрацию подтвердила, место за Вами. 🌿\n\n📅 <b>Встречаемся 1, 2, 3 и 4 октября в 19:30 по Москве.</b>\nРаботать будем вживую в Zoom, ссылки я буду присылать прямо сюда за 10 минут до начала.\n\nЗа эти 4 дня разберем всё по косточкам:\n• Почему болезнь возвращается по кругу и как вернуть смещенные органы на место.\n• Как делать диагностику причин по диаграммам и технику безопасности, чтобы не цеплять чужой негатив.\n• Как наши эмоции меняют биохимию и создают курорт для паразитов и вирусов.\n• И почему чужая зависть и негативные программы годами блокируют силы и перекрывают деньги.\n\nСразу добавьте себе даты в календарь.\nА сейчас переходите в мой Telegram-канал — там я уже выкладываю первые подготовительные материалы: 👇`,
        {
          inline_keyboard: [
            [{ text: "🌿 Перейти в мой Telegram-канал", url: "https://t.me/SchoolEmotionalBalance" }],
            [{ text: "✅ Проверить подписку на канал", callback_data: "check_sub" }]
          ]
        }
      );

      logToGoogle({ tg_id: chatId, status: "registered", name: body.name || "", phone: body.phone || "" });
      return { statusCode: 200, body: "Registered handled" };
    }

    // 2. ВЕБХУК ИЗ ТИЛЬДЫ: АНКЕТА ПРЕДЗАПИСИ ЗАПОЛНЕНА
    if (body.action === "anketa_pred_done" && body.tg_id) {
      const chatId = body.tg_id;
      await sendMessage(
        chatId,
        `Вашу анкету получила, спасибо за доверие и честные ответы. 🌿\n\nЯ вижу, с какими непростыми ситуациями вы сталкиваетесь и очень ценю вашу готовность не опускать руки, а разбираться со своим здоровьем по-взрослому.\n\nТеперь переходите в наш закрытый чат предзаписи. Это закрытое пространство для тех, кто настроен идти на глубину:\n▫️ Здесь мы собираемся узким кругом без лишних глаз.\n▫️ Здесь пройдет предобучение и разборы ваших анкет.\n▫️ 9 октября на закрытой встрече мы проведем главный розыгрыш обучения и откроем возможность зайти в Школу по самой минимальной цене.\n\nВступайте в чат по кнопке ниже: 👇`,
        {
          inline_keyboard: [
            [{ text: "💬 Вступить в чат предзаписи", url: PRE_CHAT_URL }]
          ]
        }
      );
      return { statusCode: 200, body: "Anketa handled" };
    }

    // 3. ОБРАБОТКА НАЖАТИЙ НА КНОПКИ (CALLBACKS)
    if (body.callback_query) {
      const cq = body.callback_query;
      const chatId = cq.message.chat.id;
      const data = cq.data;
      const firstName = cq.from.first_name || "друг";

      await callTg("answerCallbackQuery", { callback_query_id: cq.id });

      // Проверка подписки на канал (0.4)
      if (data === "check_sub") {
        const isUserSubscribed = await checkSub(cq.from.id);
        if (isUserSubscribed) {
          await sendMessage(
            chatId,
            `Отлично, вижу Вас в Телеграм-канале Школы Эмоционального Баланса! 🌿\nСледите за новостями — скоро я выложу пост, где можно будет отправить свою ситуацию на разбор к эфиру!`
          );

          // Переход к сегментации
          await sendMessage(
            chatId,
            `Слушайте, мне к 1 октября нужно понимать, кто ко мне на эфиры придет.\n\nЯ терпеть не могу абстрактные лекции обо всём и ни о чём. Мне важно понимать конкретные запросы, чтобы прямо на живых эфирах в Zoom взять ваши ситуации и показать, как в них работает метод диагностики причин. Без ваших ответов я просто не смогу сделать разборы точечными.\n\nОтветьте честно, буквально в один клик: с какой задачей Вы идете на марафон?\nЖмите на свой вариант, я учту это в программе: 👇`
          );

          await sendMessage(chatId, `<b>1. Есть ли у Вас проблемы со своим здоровьем?</b>`, {
            inline_keyboard: [
              [{ text: "Да", callback_data: "seg_q1_yes" }, { text: "Нет", callback_data: "seg_q1_no" }]
            ]
          });
        } else {
          await sendMessage(
            chatId,
            `Проверила — в Телеграм-канале Школы Вас пока нет.\nПереходите по ссылке, вступайте, возвращайтесь сюда и жмите проверку:`,
            {
              inline_keyboard: [
                [{ text: "🔒 Вступить в Тг-канал Школы", url: "https://t.me/SchoolEmotionalBalance" }],
                [{ text: "🔄 Я вступил(а), проверить!", callback_data: "check_sub" }]
              ]
            }
          );
        }
        return { statusCode: 200, body: "OK" };
      }

      // Вопрос 1
      if (data === "seg_q1_yes" || data === "seg_q1_no") {
        logToGoogle({ tg_id: cq.from.id, step: "q1", answer: data });
        if (data === "seg_q1_yes") {
          await sendMessage(chatId, "Напишите, пожалуйста, в ответном сообщении: <b>какие именно проблемы вас беспокоят?</b>");
        }
        await sendMessage(chatId, `<b>2. Есть ли проблемы со здоровьем у Ваших близких, которые Вы хотели бы решить этим методом?</b>`, {
          inline_keyboard: [
            [{ text: "Да", callback_data: "seg_q2_yes" }, { text: "Нет", callback_data: "seg_q2_no" }]
          ]
        });
        return { statusCode: 200, body: "OK" };
      }

      // Вопрос 2
      if (data === "seg_q2_yes" || data === "seg_q2_no") {
        logToGoogle({ tg_id: cq.from.id, step: "q2", answer: data });
        if (data === "seg_q2_yes") {
          await sendMessage(chatId, "Напишите, пожалуйста: <b>какие проблемы у близких?</b>");
        }
        await sendMessage(chatId, `<b>3. Есть ли у Вас текущая база клиентов, которым Вы хотели бы помогать через метод диагностики причин?</b>`, {
          inline_keyboard: [
            [{ text: "Да", callback_data: "seg_q3_yes" }, { text: "Нет", callback_data: "seg_q3_no" }]
          ]
        });
        return { statusCode: 200, body: "OK" };
      }

      // Вопрос 3
      if (data === "seg_q3_yes" || data === "seg_q3_no") {
        logToGoogle({ tg_id: cq.from.id, step: "q3", answer: data });
        await sendMessage(chatId, `Принято! 🌿 Спасибо за искренность. Я внимательно изучу ответы и подготовлю точечные разборы на эфиры.`);
        return { statusCode: 200, body: "OK" };
      }

      if (data === "will_be_there") {
        await sendMessage(chatId, `Отлично! 🌿 Обязательно выделите время, встретимся ровно в 19:30.`);
        return { statusCode: 200, body: "OK" };
      }
    }

    // 4. ТЕКСТОВЫЕ СООБЩЕНИЯ И /start
    if (body.message) {
      const msg = body.message;
      const chatId = msg.chat.id;
      const text = msg.text || "";
      const firstName = msg.from.first_name || "Гость";

      // 0.1. Приветствие при /start
      if (text.startsWith("/start")) {
        await sendMessage(
          chatId,
          `Здравствуйте. Рада приветствовать вас. 🌿\nНа связи Татьяна Григорьева и Школа Эмоционального Баланса.`,
          {
            inline_keyboard: [
              [{ text: "🚀 Войти в кабинет и зарегистрироваться", web_app: { url: MINI_APP_URL } }],
              [{ text: "Перейти в Telegram-канал", url: "https://t.me/SchoolEmotionalBalance" }]
            ]
          }
        );

        logToGoogle({ tg_id: chatId, step: "start_clicked", name: firstName, username: msg.from.username || "" });
        return { statusCode: 200, body: "OK" };
      }

      // Ответ текстом на опрос
      if (text) {
        logToGoogle({ tg_id: chatId, step: "user_text_reply", text: text });
        await sendMessage(chatId, `Зафиксировала ваш ответ. 🌿`);
        return { statusCode: 200, body: "OK" };
      }
    }

    return { statusCode: 200, body: "OK" };
  } catch (err) {
    console.error("Webhook Error:", err);
    return { statusCode: 200, body: "Error" };
  }
};