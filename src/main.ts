import { Telegraf, session } from 'telegraf';
import config from 'config';
import { message } from 'telegraf/filters';
import { code } from 'telegraf/format';
import { ogg } from './ogg.js';
import { openai } from './openai.js';
import { ChatCompletionRequestMessageRoleEnum } from 'openai';
import { ChatCompletionRequestMessage } from 'openai/api.js';
import { Context } from 'telegraf';
import { removeFile } from './utils.js';

type InitialSession = {
  messages: ChatCompletionRequestMessage[];
};

const INITIAL_SESSION: InitialSession = {
  messages: [],
};
const bot = new Telegraf<
  Context & {
    session: typeof INITIAL_SESSION;
  }
>(config.get('TELEGRAM_TOKEN'));

bot.use(session());

bot.launch();

bot.command('new', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply('Жду вашего голосового или текстового ответа');
});

bot.command('start', async (ctx) => {
  ctx.session = INITIAL_SESSION;
  await ctx.reply('Жду вашего голосового или текстового ответа');
});

bot.on(message('voice'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    ctx.reply(code('Сообщение принято, жду ответа от сервера...'));
    const link = await ctx.telegram.getFileLink(ctx.message.voice.file_id);
    const userId = String(ctx.message.from.id);
    const oggPath = await ogg.create(link.href, userId);
    if (oggPath) {
      const mp3Path = await ogg.toMp3(oggPath, userId);
      if (mp3Path) {
        const text = await openai.transcription(mp3Path);
        await removeFile(mp3Path);
        ctx.reply(code(`ваш запрос ${text}`));
        if (text) {
          ctx.session.messages.push({ role: ChatCompletionRequestMessageRoleEnum.User, content: text });
          const response = await openai.chat(ctx.session.messages);
          if (response?.content) {
            ctx.session.messages.push({
              role: ChatCompletionRequestMessageRoleEnum.Assistant,
              content: response.content,
            });
            ctx.reply(response.content);
          }
        }
      }
    }
  } catch (e: any) {
    console.log(`Error while voice message`, e.message);
  }
});

bot.on(message('text'), async (ctx) => {
  ctx.session ??= INITIAL_SESSION;
  try {
    ctx.reply(code('Сообщение принято, жду ответа от сервера...'));
    ctx.session.messages.push({ role: ChatCompletionRequestMessageRoleEnum.User, content: ctx.message.text });

    ctx.session.messages.push({
      role: ChatCompletionRequestMessageRoleEnum.User,
      content: ctx.message.text,
    });
    const response = await openai.chat(ctx.session.messages);
    if (response?.content) {
      ctx.session.messages.push({
        role: ChatCompletionRequestMessageRoleEnum.Assistant,
        content: response.content,
      });
      ctx.reply(response.content);
    }
  } catch (e: any) {
    console.log(`Error while voice message`, e.message);
  }
});
process.once('SIGINT', () => bot.stop('SIGINT'));

process.once('SIGTERM', () => bot.stop('SIGTERM'));
