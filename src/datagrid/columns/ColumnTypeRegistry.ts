import { IColumnTypePlugin } from './IColumnTypePlugin';

export class ColumnTypeRegistry {
  private static plugins: Map<string, IColumnTypePlugin> = new Map();

  public static register(plugin: IColumnTypePlugin): void {
    const key = (plugin.type || '').toLowerCase();
    this.plugins.set(key, plugin);
    if (plugin.type && plugin.type !== key) {
      this.plugins.set(plugin.type, plugin);
    }
  }

  public static get(type: string): IColumnTypePlugin {
    const key = (type || '').toLowerCase();
    const plugin = this.plugins.get(key) || this.plugins.get(type);
    if (!plugin) {
      // Bulunamadıysa text eklentisine geri dön
      return this.plugins.get('text')!;
    }
    return plugin;
  }

  public static has(type: string): boolean {
    const key = (type || '').toLowerCase();
    return this.plugins.has(key) || this.plugins.has(type);
  }

  public static getAll(): IColumnTypePlugin[] {
    return Array.from(new Set(this.plugins.values()));
  }
}
