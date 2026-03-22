/**
 * Spintax processor utility
 * Processes {option1|option2|option3} syntax in templates.
 * Source: etapa2-workers-F-templates.md
 */

/**
 * Process spintax patterns in content.
 * Randomly selects one option from each {a|b|c} group.
 * Supports nested spintax.
 * Substitutes {{variable}} placeholders.
 */
export function processSpintax(template: string, variables: Record<string, string> = {}): string {
  let result = template;

  // Process spintax {option1|option2|...} — supports nested
  result = processSpintaxGroups(result);

  // Substitute {{variable}} placeholders
  result = result.replaceAll(/\{\{(\w+)\}\}/g, (match, key) => variables[key] ?? match);

  return result;
}

function processSpintaxGroups(text: string): string {
  // Find the innermost {a|b} groups first (no nested braces)
  const innerPattern = /\{([^{}]+)\}/g;
  let result = text;
  let hasMore = true;

  while (hasMore) {
    hasMore = false;
    result = result.replaceAll(innerPattern, (_match, options) => {
      hasMore = true;
      const choices = options.split("|");
      return choices[Math.floor(Math.random() * choices.length)] ?? "";
    });
  }

  return result;
}

/**
 * Detect variables in a template body.
 * Variables are in {{variableName}} format.
 * Returns unique variable names detected.
 */
export function detectVariables(template: string): string[] {
  const matches = template.matchAll(/\{\{(\w+)\}\}/g);
  const variables = new Set<string>();
  for (const match of matches) {
    variables.add(match[1]);
  }
  return Array.from(variables);
}
