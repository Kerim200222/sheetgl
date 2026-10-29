import { IColumnTypePlugin } from '../../IColumnTypePlugin';
import { paintMultiSelect, normalizeMultiValue } from './MultiSelectPainter';
import { MultiSelectEditor } from './MultiSelectEditor';

export const MultiSelectColumnPlugin: IColumnTypePlugin<string[] | string> = {
  type: 'multiselect',
  paint: paintMultiSelect,
  editorComponent: MultiSelectEditor,

  onPointerDown({ localX, column }) {
    if (localX > column.width - 28) {
      return { handled: true, shouldOpenEditor: true };
    }
    return { handled: false };
  },

  onKeyDown({ event, openEditor }) {
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault();
      openEditor();
      return true;
    }
    if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
      openEditor(event.key);
      return true;
    }
    return false;
  },

  parseClipboard(text, column) {
    if (text === null || text === undefined) return [];
    const parts = normalizeMultiValue(String(text).replace(/^["']|["']$/g, '').trim());
    if (!column.options || column.options.length === 0) return parts;
    return parts.map((p) => {
      const clean = String(p ?? '').replace(/^["']|["']$/g, '').trim().toLowerCase();
      const match = column.options?.find((o) => {
        const valStr = String(o?.value ?? '').replace(/^["']|["']$/g, '').trim().toLowerCase();
        const lblStr = String(o?.label ?? '').replace(/^["']|["']$/g, '').trim().toLowerCase();
        return valStr === clean || lblStr === clean;
      });
      return match ? match.value : String(p).replace(/^["']|["']$/g, '').trim();
    });
  },

  formatClipboard(value, column) {
    const items = normalizeMultiValue(value);
    return items
      .map((v) => {
        const match = column.options?.find((o) => o.value === v);
        return match ? match.label : v;
      })
      .join(', ');
  },

  comparator(a, b) {
    const strA = normalizeMultiValue(a).join(', ');
    const strB = normalizeMultiValue(b).join(', ');
    return strA.localeCompare(strB, 'tr-TR');
  },
};
