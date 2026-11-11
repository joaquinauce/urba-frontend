import { Component, ElementRef, HostListener, Input, ViewChild, forwardRef, inject } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

export type SearchOption = { value: string; label: string };

@Component({
  selector: 'app-search-select',
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => SearchSelect), multi: true }],
  template: `
    <div class="search-select">
      <button class="search-select-trigger" type="button" [disabled]="disabled" [attr.aria-expanded]="open" [attr.aria-label]="label" (click)="toggle()">
        <span>{{ selectedLabel || placeholder }}</span><span aria-hidden="true">⌄</span>
      </button>
      @if (open) {
        <div class="search-select-menu">
          <input #searchInput type="search" [attr.aria-label]="'Buscar ' + label" placeholder="Buscar…" [value]="query" (input)="query = $any($event.target).value" (keydown.enter)="selectFirst($event)">
          <div class="search-select-options" role="listbox" [attr.aria-label]="label">
            @if (allowEmpty) { <button type="button" role="option" [attr.aria-selected]="!value" (click)="choose('')">{{ emptyLabel }}</button> }
            @for (option of filteredOptions; track option.value) { <button type="button" role="option" [attr.aria-selected]="value === option.value" (click)="choose(option.value)">{{ option.label }}</button> }
            @if (!filteredOptions.length) { <span class="search-select-empty">Sin resultados</span> }
          </div>
        </div>
      }
    </div>`,
  styles: [`
    :host{display:block;min-width:0}.search-select{position:relative;min-width:0;margin-top:8px}.search-select-trigger{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;min-height:44px;padding:10px 13px;border:1px solid #dfd5c9;border-radius:9px;background:#fffdf9;color:#302820;text-align:left;font:inherit;cursor:pointer}.search-select-trigger span:first-child{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.search-select-trigger:focus-visible{outline:2px solid #fb8d00;outline-offset:2px}.search-select-menu{position:absolute;z-index:50;top:calc(100% + 5px);left:0;width:100%;min-width:min(260px,calc(100vw - 70px));padding:8px;border:1px solid #dfd5c9;border-radius:11px;background:#fff;box-shadow:0 14px 34px #1c352a24}.search-select-menu input{width:100%;margin:0 0 6px!important}.search-select-options{max-height:210px;overflow-y:auto}.search-select-options button{display:block;width:100%;padding:10px;border:0;border-radius:7px;background:transparent;text-align:left;color:#302820;cursor:pointer}.search-select-options button:hover,.search-select-options button[aria-selected=true]{background:#fff2e3}.search-select-empty{display:block;padding:11px;color:#75695c;font-size:.85rem}
  `],
})
export class SearchSelect implements ControlValueAccessor {
  private host = inject(ElementRef<HTMLElement>);
  @ViewChild('searchInput') searchInput?: ElementRef<HTMLInputElement>;
  @Input() options: SearchOption[] = [];
  @Input() label = 'Opción';
  @Input() placeholder = 'Seleccionar';
  @Input() allowEmpty = false;
  @Input() emptyLabel = 'Ninguno';
  value = '';
  query = '';
  open = false;
  disabled = false;
  private change: (value: string) => void = () => {};
  private touched: () => void = () => {};
  get selectedLabel() { return this.options.find(option => option.value === this.value)?.label ?? ''; }
  get filteredOptions() { const term = this.query.trim().toLocaleLowerCase('es'); return this.options.filter(option => option.label.toLocaleLowerCase('es').includes(term)); }
  writeValue(value: string): void { this.value = value || ''; }
  registerOnChange(fn: (value: string) => void): void { this.change = fn; }
  registerOnTouched(fn: () => void): void { this.touched = fn; }
  setDisabledState(disabled: boolean): void { this.disabled = disabled; }
  toggle() { this.open = !this.open; this.query = ''; if (this.open) setTimeout(() => this.searchInput?.nativeElement.focus()); else this.touched(); }
  choose(value: string) { this.value = value; this.change(value); this.touched(); this.open = false; this.query = ''; }
  selectFirst(event: Event) { event.preventDefault(); event.stopPropagation(); const first = this.filteredOptions[0]; if (first) this.choose(first.value); }
  @HostListener('document:click', ['$event']) onOutside(event: MouseEvent) { if (!this.host.nativeElement.contains(event.target as Node)) { this.open = false; this.touched(); } }
  @HostListener('document:keydown.escape') onEscape() { this.open = false; }
}
