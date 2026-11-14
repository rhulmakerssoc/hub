import {
  DESIGN_TYPES,
  FLAT_SERVICE_CHARGE,
  KEYRING_MODELS,
  KeyringModel,
  formatGbp,
  modelsFor,
  quoteKeyrings,
} from './keyring-pricing';

// Fixed test models so these tests keep passing when real prices change.
const thirteenPence: KeyringModel = { id: 't1', kind: '3d', name: 'Test A', baseCost: 0.13, maxCharacters: 20 };
const twentyPence: KeyringModel = { id: 't2', kind: '3d', name: 'Test B', baseCost: 0.2, maxCharacters: 10 };

describe('quoteKeyrings', () => {
  it('charges base cost plus the flat service charge for a single keyring', () => {
    const q = quoteKeyrings(thirteenPence, 1);
    expect(q.discount).toBe(0);
    expect(formatGbp(q.total)).toBe(formatGbp(0.13 + FLAT_SERVICE_CHARGE));
    expect(formatGbp(q.perKeyring)).toBe('£0.13');
  });

  it.each([
    [10, 0],
    [11, 0.05],
    [25, 0.05],
    [26, 0.1],
    [50, 0.1],
    [51, 0.15],
    [5000, 0.15],
  ])('applies the right discount for %i keyrings', (quantity, discount) => {
    expect(quoteKeyrings(thirteenPence, quantity).discount).toBe(discount);
  });

  it('discounts the keyrings but not the service charge', () => {
    const q = quoteKeyrings(twentyPence, 30); // 30 × £0.20 = £6.00, less 10% = £5.40
    expect(formatGbp(q.subtotal)).toBe('£5.40');
    expect(formatGbp(q.total)).toBe(formatGbp(5.4 + FLAT_SERVICE_CHARGE));
    expect(formatGbp(q.perKeyring)).toBe('£0.18');
  });

  it.each([NaN, 0, -3])('treats an invalid quantity (%s) as 1', (bad) => {
    expect(quoteKeyrings(thirteenPence, bad).quantity).toBe(1);
  });
});

describe('keyring models', () => {
  it('every preset design type has at least one model to choose', () => {
    for (const type of DESIGN_TYPES) {
      if (type.kind) expect(modelsFor(type.kind).length).toBeGreaterThan(0);
    }
  });

  it('model ids are unique', () => {
    const ids = KEYRING_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
