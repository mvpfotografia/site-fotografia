import { json, setCookie } from '../../../lib/core.js';
export const onRequestPost = async () => json({ ok: true }, 200, { 'set-cookie': setCookie('adm', '', 0) });
