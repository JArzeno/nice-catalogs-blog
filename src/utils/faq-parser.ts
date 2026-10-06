import type { PortableTextBlock } from "emdash";

/**
 * Extract FAQ items from Portable Text content by finding an H2 heading
 * with "FAQ" or "Preguntas frecuentes", followed by H3 questions and their
 * answer paragraphs.
 */
export function extractFaqFromContent(
	content: PortableTextBlock[],
	locale: "en" | "es"
): Array<{ question: string; answer: string }> {
	if (!Array.isArray(content)) return [];

	const faqHeadings = locale === "es" 
		? ["preguntas frecuentes", "faq", "preguntas"]
		: ["frequently asked questions", "faq", "faqs"];

	const results: Array<{ question: string; answer: string }> = [];
	let inFaqSection = false;
	let currentQuestion: string | null = null;
	let currentAnswer: string[] = [];

	for (let i = 0; i < content.length; i++) {
		const block = content[i];
		if (!block || typeof block !== "object") continue;

		// Check if this is an H2 FAQ section start
		if (block.style === "h2") {
			const text = extractText(block).toLowerCase().trim();
			if (faqHeadings.some((h) => text.includes(h))) {
				inFaqSection = true;
				continue;
			} else if (inFaqSection) {
				// New H2 means end of FAQ section
				break;
			}
		}

		// If we're in the FAQ section, process H3 (questions) and paragraphs (answers)
		if (inFaqSection) {
			if (block.style === "h3") {
				// Save previous Q&A if exists
				if (currentQuestion && currentAnswer.length > 0) {
					results.push({
						question: currentQuestion,
						answer: currentAnswer.join("\n\n"),
					});
				}
				// Start new question
				currentQuestion = extractText(block).trim();
				currentAnswer = [];
			} else if (block.style === "normal" || !block.style) {
				// Accumulate answer paragraphs
				const text = extractText(block).trim();
				if (text && currentQuestion) {
					currentAnswer.push(text);
				}
			} else if (block.style && block.style.startsWith("h") && block.style !== "h3") {
				// Non-H3 heading ends the FAQ section
				break;
			}
		}
	}

	// Don't forget the last Q&A
	if (currentQuestion && currentAnswer.length > 0) {
		results.push({
			question: currentQuestion,
			answer: currentAnswer.join("\n\n"),
		});
	}

	return results;
}

/**
 * Extract plain text from a Portable Text block, handling spans and inline marks.
 */
function extractText(block: PortableTextBlock): string {
	if (!block || typeof block !== "object") return "";
	
	// Handle blocks with children (paragraphs, headings, etc.)
	if (Array.isArray(block.children)) {
		return block.children
			.map((child: unknown) => {
				if (typeof child === "object" && child !== null && "text" in child) {
					return String((child as { text: unknown }).text);
				}
				return "";
			})
			.join("");
	}

	// Handle direct text
	if ("text" in block && typeof block.text === "string") {
		return block.text;
	}

	return "";
}
