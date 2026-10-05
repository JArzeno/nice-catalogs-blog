export type Lang = "en" | "es";

/** Per-language settings for `og:locale` and date formatting. */
export const LANGUAGES: Record<Lang, { ogLocale: string; dateLocale: string }> = {
	en: { ogLocale: "en_US", dateLocale: "en-US" },
	es: { ogLocale: "es_419", dateLocale: "es-DO" },
};

const WORD_RE = /\p{L}+/gu;
// Characters that only appear in Spanish text count more than accented vowels,
// which also show up in English loanwords ("café", "résumé").
const SPANISH_ONLY_CHARS_RE = /[ñ¿¡]/;
const ACCENTED_VOWEL_RE = /[áéíóú]/;

// Common function words. Words used in both languages ("a", "no", "me") are
// left out so they don't tip the score either way.
const SPANISH_WORDS = new Set([
	"al", "como", "cómo", "con", "cuál", "cuando", "cuándo", "de", "del", "desde", "donde", "dónde",
	"el", "en", "entre", "es", "esta", "está", "este", "estos", "las", "la", "los", "más", "mi",
	"mis", "muy", "o", "para", "pero", "por", "porque", "qué", "que", "sin", "sobre", "su", "sus",
	"también", "tu", "tus", "un", "una", "unos", "unas", "y",
]);
const ENGLISH_WORDS = new Set([
	"about", "an", "and", "are", "as", "at", "be", "by", "can", "do", "does", "each", "for",
	"from", "get", "has", "have", "how", "in", "into", "is", "it", "its", "more", "of", "on",
	"or", "our", "than", "that", "the", "their", "these", "this", "to", "we", "what", "when",
	"where", "which", "who", "why", "will", "with", "without", "you", "your",
]);

function isLang(value: unknown): value is Lang {
	return value === "en" || value === "es";
}

/**
 * Guess whether a short text (title + excerpt) is Spanish or English by
 * counting whole-word function words. Ties go to English.
 */
export function detectLanguage(text: string): Lang {
	const lower = text.toLowerCase();
	let spanish = 0;
	let english = 0;
	for (const word of lower.match(WORD_RE) ?? []) {
		if (SPANISH_WORDS.has(word)) spanish++;
		else if (ENGLISH_WORDS.has(word)) english++;
	}
	if (SPANISH_ONLY_CHARS_RE.test(lower)) spanish += 2;
	else if (ACCENTED_VOWEL_RE.test(lower)) spanish += 1;
	return spanish > english ? "es" : "en";
}

/**
 * A post's language: the explicit `language` field when an editor set one,
 * otherwise detected from the title and excerpt.
 */
export function postLanguage(data: { language?: unknown; title: string; excerpt?: string | null }): Lang {
	if (isLang(data.language)) return data.language;
	return detectLanguage(`${data.title} ${data.excerpt ?? ""}`);
}
