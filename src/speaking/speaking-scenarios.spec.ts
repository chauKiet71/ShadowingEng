import { CefrLevel } from '@prisma/client';
import { SPEAKING_SCENARIOS } from './speaking-scenarios';

describe('SPEAKING_SCENARIOS', () => {
  const addedLevels = [
    CefrLevel.A1,
    CefrLevel.A2,
    CefrLevel.B1,
    CefrLevel.B2,
    CefrLevel.C1,
  ];

  it.each(addedLevels)('contains 10 new scenarios dedicated to %s', (level) => {
    const prefix = `${level.toLowerCase()}-`;
    const scenarios = SPEAKING_SCENARIOS.filter((scenario) =>
      scenario.slug.startsWith(prefix),
    );

    expect(scenarios).toHaveLength(10);
    expect(
      scenarios.every(
        (scenario) =>
          scenario.minLevel === level && scenario.maxLevel === level,
      ),
    ).toBe(true);
  });

  it('uses unique slugs and sort orders across the full catalog', () => {
    const slugs = SPEAKING_SCENARIOS.map((scenario) => scenario.slug);
    const sortOrders = SPEAKING_SCENARIOS.map((scenario) => scenario.sortOrder);

    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(sortOrders).size).toBe(sortOrders.length);
  });
});
