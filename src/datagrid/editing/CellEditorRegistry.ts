import { CellEditorComponent } from './ICellEditor';
import { DefaultCellEditor } from './DefaultCellEditor';

/**
 * Global registry for pluggable cell editors in SheetGL.
 * Allows components and plugins to register custom editing components by type name.
 */
export class CellEditorRegistry {
  private static editors: Map<string, CellEditorComponent<any, any>> = new Map();
  private static defaultEditor: CellEditorComponent<any, any> = DefaultCellEditor;

  /**
   * Registers a custom editor React component for a given column or editor type.
   *
   * @param type - The editor type identifier (e.g. 'text', 'number', 'date', 'select', 'custom-picker')
   * @param editor - React component implementing ICellEditorProps
   */
  public static register(type: string, editor: CellEditorComponent<any, any>): void {
    if (!type || !editor) return;
    const key = type.toLowerCase();
    this.editors.set(key, editor);
    if (type !== key) {
      this.editors.set(type, editor);
    }
  }

  /**
   * Unregisters an editor component for the specified type.
   */
  public static unregister(type: string): boolean {
    if (!type) return false;
    const key = type.toLowerCase();
    const removedLower = this.editors.delete(key);
    const removedExact = this.editors.delete(type);
    return removedLower || removedExact;
  }

  /**
   * Retrieves the registered editor component for a type, or falls back to the default editor.
   *
   * @param type - The editor type identifier
   * @returns The registered React component or default fallback editor
   */
  public static get(type?: string): CellEditorComponent<any, any> {
    if (!type) {
      return this.defaultEditor;
    }
    const key = type.toLowerCase();
    const editor = this.editors.get(key) || this.editors.get(type);
    return editor || this.defaultEditor;
  }

  /**
   * Checks whether a custom editor is explicitly registered for the type.
   */
  public static has(type: string): boolean {
    if (!type) return false;
    const key = type.toLowerCase();
    return this.editors.has(key) || this.editors.has(type);
  }

  /**
   * Sets the global default fallback editor.
   */
  public static setDefaultEditor(editor: CellEditorComponent<any, any>): void {
    this.defaultEditor = editor || DefaultCellEditor;
  }

  /**
   * Returns the global default fallback editor.
   */
  public static getDefaultEditor(): CellEditorComponent<any, any> {
    return this.defaultEditor;
  }

  /**
   * Returns all registered editor types.
   */
  public static getRegisteredTypes(): string[] {
    return Array.from(this.editors.keys());
  }

  /**
   * Clears all registered custom editors and resets the default editor.
   */
  public static clear(): void {
    this.editors.clear();
    this.defaultEditor = DefaultCellEditor;
  }
}
