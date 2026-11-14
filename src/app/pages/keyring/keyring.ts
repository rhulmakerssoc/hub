import { Component, computed, signal } from '@angular/core';
import { SITE } from '../../site-content';
import {
  COLOURS,
  DESIGN_TYPES,
  DesignTypeId,
  FLAT_SERVICE_CHARGE,
  LARGE_ORDER_NOTE,
  formatGbp,
  modelsFor,
  quoteKeyrings,
} from './keyring-pricing';

@Component({
  selector: 'app-keyring-page',
  templateUrl: './keyring.html',
  styleUrl: './keyring.css',
})
export class KeyringPage {
  protected readonly site = SITE;
  protected readonly designTypes = DESIGN_TYPES;
  protected readonly colours = COLOURS;
  protected readonly serviceCharge = formatGbp(FLAT_SERVICE_CHARGE);
  protected readonly largeOrderNote = LARGE_ORDER_NOTE;

  protected readonly designTypeId = signal<DesignTypeId>(DESIGN_TYPES[0].id);
  protected readonly quantityInput = signal('1');
  protected readonly modelId = signal(modelsFor('3d')[0].id);
  protected readonly text = signal('');
  protected readonly colour = signal(COLOURS[0]);

  private readonly designType = computed(
    () => DESIGN_TYPES.find((t) => t.id === this.designTypeId()) ?? DESIGN_TYPES[0],
  );
  protected readonly isCustom = computed(() => this.designType().kind === null);

  /** Only the models that belong to the chosen design type (3D print or laser cut). */
  protected readonly models = computed(() => modelsFor(this.designType().kind ?? '3d'));
  protected readonly model = computed(
    () => this.models().find((m) => m.id === this.modelId()) ?? this.models()[0],
  );

  protected readonly quote = computed(() =>
    quoteKeyrings(this.model(), Number.parseInt(this.quantityInput(), 10)),
  );
  protected readonly totalPrice = computed(() => formatGbp(this.quote().total));
  protected readonly perKeyringPrice = computed(() => formatGbp(this.quote().perKeyring));

  protected readonly orderMailto = computed(() => {
    const q = this.quote();
    const text = this.text().trim();
    const subject = `Keyring Order Inquiry - ${q.quantity}x ${this.model().name}`;
    const body = [
      'Keyring Order Details:',
      `Quantity: ${q.quantity}`,
      `Keyring Model: ${this.model().name}`,
      `Text on Keyring: ${text ? `"${text}"` : 'None specified'}`,
      `Desired Colour: ${this.colour()}`,
      `Total Estimated Price (including service charge): ${this.totalPrice()}`,
      `Price Per Keyring (excluding service charge): ${this.perKeyringPrice()}`,
      '',
      `Notes: (A flat service charge of ${this.serviceCharge} is applied per order. ${LARGE_ORDER_NOTE})`,
      '',
      'Please provide any additional details or questions here.',
    ].join('\n');
    return mailto(subject, body);
  });

  protected readonly customMailto = mailto(
    'Custom Keyring Design Inquiry',
    'I would like to inquire about a custom keyring design. Please contact me to discuss my requirements.',
  );

  protected onDesignTypeChange(id: string): void {
    this.designTypeId.set(id as DesignTypeId);
    if (!this.isCustom()) {
      // Switching between 3D and laser changes the model list: pick its first model.
      this.onModelChange(this.models()[0].id);
    }
  }

  protected onModelChange(id: string): void {
    this.modelId.set(id);
    // Trim any text that no longer fits the newly chosen model.
    this.text.update((t) => t.slice(0, this.model().maxCharacters));
  }

  /** Tidy the quantity field once the visitor leaves it, so a blank or 0 shows as 1. */
  protected normaliseQuantity(input: HTMLInputElement): void {
    const q = String(this.quote().quantity);
    input.value = q;
    this.quantityInput.set(q);
  }
}

function mailto(subject: string, body: string): string {
  return `mailto:${SITE.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
