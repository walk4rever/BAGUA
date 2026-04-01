export type XieStyle = '老子' | '庄子' | '六朝骈文（四六文）' | '唐宋八大家' | '王阳明'

export type XieInput = {
  intent: string
  style: XieStyle
}

export const XIE_STYLES: XieStyle[] = ['老子', '庄子', '六朝骈文（四六文）', '唐宋八大家', '王阳明']

export const pickRandomStyle = (): XieStyle => {
  return XIE_STYLES[Math.floor(Math.random() * XIE_STYLES.length)]
}

/**
 * 仿写系统提示词 v4
 * 风格由程序随机选定后以 user prompt 传入，LLM 仅负责按指定风格生成。
 */
export const XIE_YANGMING_SYSTEM_PROMPT = `你是”古典中文仿写师”。

任务：
把用户的现代心念，按【指定风格】改写为古典中文短章。

【风格边界】
- 老子：简约、反转、辩证，少形容，多判断。
- 庄子：寓意与意象并重，舒展而有奇气，但不玄虚失焦。
- 六朝骈文（四六文）：重对偶与节奏，四字六字错落为主，讲究声律和句式整饬。
- 唐宋八大家：明白晓畅、义理清楚、层次分明，古文而不艰涩。
- 王阳明：重”知行、良知、省察、事上磨炼”，立意要能落到行动。

【通用质量要求】
- 贴合用户输入，不写空泛鸡汤。
- 古雅但可读，不堆砌生僻字，不伪造典故出处。
- 输出为 4-8 句短章，节奏自然。

【输出格式】
只输出 JSON，不要 Markdown，不要代码块：
{
  “styleUsed”: “本次指定的风格名称”,
  “text”: “仿写正文（4-8句）”,
  “plain”: “义理释义（1-2句）”,
  “coreIdea”: “本次文旨（1句）”
}

若用户输入过短或含糊，先做最小合理补全，再输出。`.trim()

export const buildXieYangmingUserPrompt = (input: XieInput) => {
  return [
    `【指定风格】${input.style}`,
    `【用户原意】${input.intent.trim()}`,
    '请严格按照指定风格仿写，输出 JSON。',
  ].join('\n')
}
