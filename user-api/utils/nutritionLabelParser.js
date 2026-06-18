function normalizeText(text) {
  return (text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2022\u00b7|]/g, ' ')
    .replace(/\r/g, '\n')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[ \t]+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toNumber(value) {
  if (value === undefined || value === null) return null;
  const cleaned = String(value).replace(/[, ]+/g, '').replace(/[^\d.-]/g, '');
  if (!cleaned) return null;
  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : null;
}

function extractMetric(lines, compactText, patterns) {
  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;

    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match && match[1] !== undefined) {
        const parsed = toNumber(match[1]);
        if (parsed !== null) return parsed;
      }
    }
  }

  for (const pattern of patterns) {
    const match = compactText.match(pattern);
    if (match && match[1] !== undefined) {
      const parsed = toNumber(match[1]);
      if (parsed !== null) return parsed;
    }
  }

  return null;
}

function extractNutritionLabelFields(text) {
  const normalized = normalizeText(text);
  const lines = normalized
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  const compact = lines.join(' | ');

  const calories = extractMetric(lines, compact, [
    /(?:^|\b)(?:calories?|energy)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
    /\b(?:calories?|energy)\b[^0-9]{0,12}(\d+(?:[.,]\d+)?)/i
  ]);

  const protein = extractMetric(lines, compact, [
    /\b(?:protein|proteins?|proteines?)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
    /\bprotein\b[^0-9]{0,10}(\d+(?:[.,]\d+)?)/i
  ]);

  const fat = extractMetric(lines, compact, [
    /\b(?:total\s+fat|fat|lipides?)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
    /\b(?:total\s+fat|fat)\b[^0-9]{0,10}(\d+(?:[.,]\d+)?)/i
  ]);

  const carbohydrates = extractMetric(lines, compact, [
    /\b(?:total\s+carbohydrate|carbohydrates?|carbs?|glucides?)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
    /\b(?:carbohydrates?|carbs?)\b[^0-9]{0,10}(\d+(?:[.,]\d+)?)/i
  ]);

  const sugar = extractMetric(lines, compact, [
    /\b(?:sugars?|sugar|sucres?)\s*[:\-]?\s*(\d+(?:[.,]\d+)?)/i,
    /\bsugars?\b[^0-9]{0,10}(\d+(?:[.,]\d+)?)/i
  ]);

  return {
    calories,
    protein,
    fat,
    carbohydrates,
    sugar
  };
}

function hasDetectedValues(result) {
  return Object.values(result).some(value => value !== null && value !== undefined && value !== '');
}

module.exports = {
  extractNutritionLabelFields,
  hasDetectedValues,
  normalizeText
};
