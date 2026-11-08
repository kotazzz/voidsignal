// Общее время приложения и строка сообщений (выводится на 16-сегментную строку под главным экраном)
import { codeFor } from './messages.js';

export const clock = { t: 0 };

export const msg = { text: '', code: '000', t: -10 };
export const log = text => { msg.text = text; msg.code = codeFor(text); msg.t = clock.t; };
