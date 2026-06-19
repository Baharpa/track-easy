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

function cleanLine(line) {
  return line
    .replace(/\b\d+(?:[.,]\d+)?\s*%/g, ' ')
    .replace(/\b(?:dv|daily value)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function amountAfterLabel(line, labelPattern, { requireUnit = false } = {}) {
  const match = line.match(labelPattern);
  if (!match) return null;

  const afterLabel = line.slice(match.index + match[0].length);
  const amountPattern = requireUnit
    ? /(?:^|[^0-9])(\d+(?:[.,]\d+)?)\s*(?:g|gram|grams|mg|milligram|milligrams)\b/i
    : /(?:^|[^0-9])(\d+(?:[.,]\d+)?)(?!\s*%)/i;
  const amountMatch = afterLabel.match(amountPattern);
  return amountMatch ? toNumber(amountMatch[1]) : null;
}

function lineHasAny(line, patterns) {
  return patterns.some(pattern => pattern.test(line));
}

function findCalories(lines) {
  for (const line of lines) {
    if (!/\b(?:calories?|energy)\b/i.test(line)) continue;
    if (/\bcalories?\s+from\s+fat\b/i.test(line)) continue;
    if (/\bserv(?:ing|ings?)\b/i.test(line)) continue;

    const value = amountAfterLabel(line, /\b(?:calories?|energy)\b/i);
    if (value !== null) return value;
  }

  return null;
}

function findMacro(lines, labelPatterns, skipPatterns) {
  for (const line of lines) {
    if (lineHasAny(line, skipPatterns)) continue;

    for (const labelPattern of labelPatterns) {
      const withUnit = amountAfterLabel(line, labelPattern, { requireUnit: true });
      if (withUnit !== null) return withUnit;

      // OCR sometimes drops the "g"; only accept unitless values when no %DV remains.
      if (!/%/.test(line)) {
        const unitless = amountAfterLabel(line, labelPattern);
        if (unitless !== null) return unitless;
      }
    }
  }

  return null;
}

function findSugar(lines) {
  const totalSugar = findMacro(
    lines,
    [/\btotal\s+sugars?\b/i, /\bsugars?\b/i, /\bsucres?\b/i],
    [/\b(?:added|includes?|incl\.?)\s+\d*/i]
  );
  if (totalSugar !== null) return totalSugar;

  // Added sugar is a fallback only when OCR did not expose a total sugar line.
  return findMacro(
    lines,
    [/\b(?:includes?|incl\.?)\s*\d*(?:[.,]\d+)?\s*g?\s*added\s+sugars?\b/i, /\badded\s+sugars?\b/i],
    []
  );
}

function extractNutritionLabelFields(text) {
  const normalized = normalizeText(text);
  const lines = normalized
    .split('\n')
    .map(line => cleanLine(line))
    .filter(Boolean);

  // Parse line by line so "% DV", serving size, saturated fat, and added sugar
  // do not leak into the main nutrition fields.
  const calories = findCalories(lines);
  const fat = findMacro(
    lines,
    [/\btotal\s+fat\b/i, /\bfat\b/i, /\blipides?\b/i],
    [/\b(?:saturated|trans|polyunsaturated|monounsaturated)\s+fat\b/i, /\bcalories?\s+from\s+fat\b/i]
  );
  const carbohydrates = findMacro(
    lines,
    [/\btotal\s+carbohydrate\b/i, /\bcarbohydrates?\b/i, /\bcarbs?\b/i, /\bglucides?\b/i],
    [/\b(?:fiber|fibre|sugars?|added sugars?|sodium|cholesterol|potassium)\b/i]
  );
  const protein = findMacro(
    lines,
    [/\bproteins?\b/i, /\bproteines?\b/i],
    []
  );
  const sugar = findSugar(lines);

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
