import { describe, expect, it } from 'vitest';
import { computeExpressionStyle, expressionStyleFromFineTune } from './expressionStyleEngine';

describe('expression wordplay fine-tune wiring', () => {
  it('reads the CharacterTab wordplay key into the runtime profile', () => {
    expect(expressionStyleFromFineTune({ 'expression.humor.wordplay': 92 }).wordplay).toBe(92);
  });

  it('allows wordplay to become the dominant humor mode', () => {
    const profile = expressionStyleFromFineTune({
      'expression.humor.absurd': 0,
      'expression.humor.irony': 0,
      'expression.humor.sarcasm': 0,
      'expression.humor.dark': 0,
      'expression.humor.affiliative': 0,
      'expression.humor.aggressive': 0,
      'expression.humor.selfDirected': 0,
      'expression.humor.wordplay': 100,
      'expression.humor.contextInhibition': 0,
    });
    const response = computeExpressionStyle(profile, 'bir kelime oyunu yap');
    expect(response.humor.enabled).toBe(true);
    expect(response.humor.dominantMode).toBe('wordplay');
    expect(response.humor.strength).toBeGreaterThan(0.5);
  });
});
