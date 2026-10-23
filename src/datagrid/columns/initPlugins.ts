import { ColumnTypeRegistry } from './ColumnTypeRegistry';
import { TextColumnPlugin } from './types/TextColumn';
import { NumberColumnPlugin } from './types/NumberColumn';
import { CurrencyColumnPlugin } from './types/CurrencyColumn';
import { PercentColumnPlugin } from './types/PercentColumn';
import { BooleanColumnPlugin } from './types/BooleanColumn';
import { SelectColumnPlugin } from './types/SelectColumn';
import { DropdownColumnPlugin } from './types/DropdownColumn';
import { MultiSelectColumnPlugin } from './types/MultiSelectColumn';
import { LookupColumnPlugin } from './types/LookupColumn';
import { ObjectColumnPlugin } from './types/ObjectColumn';
import { DateColumnPlugin } from './types/DateColumn';
import { DateTimeColumnPlugin } from './types/DateTimeColumn';
import { TimeColumnPlugin } from './types/TimeColumn';
import { EmailColumnPlugin } from './types/EmailColumn';
import { UrlColumnPlugin } from './types/UrlColumn';
import { PhoneColumnPlugin } from './types/PhoneColumn';
import { ColorColumnPlugin } from './types/ColorColumn';
import { RatingColumnPlugin } from './types/RatingColumn';
import { ProgressColumnPlugin } from './types/ProgressColumn';
import { SparklineColumnPlugin } from './types/SparklineColumn';
import { ActionColumnPlugin } from './types/ActionColumn';
import { PdfColumnPlugin } from './types/PdfColumn';

let initialized = false;

export function initDefaultColumnPlugins(): void {
  if (initialized) return;

  ColumnTypeRegistry.register(TextColumnPlugin);
  ColumnTypeRegistry.register(NumberColumnPlugin);
  ColumnTypeRegistry.register(CurrencyColumnPlugin);
  ColumnTypeRegistry.register(PercentColumnPlugin);
  ColumnTypeRegistry.register(BooleanColumnPlugin);
  ColumnTypeRegistry.register(SelectColumnPlugin);
  ColumnTypeRegistry.register(DropdownColumnPlugin);
  ColumnTypeRegistry.register(MultiSelectColumnPlugin);
  ColumnTypeRegistry.register(LookupColumnPlugin);
  ColumnTypeRegistry.register(ObjectColumnPlugin);
  ColumnTypeRegistry.register(DateColumnPlugin);
  ColumnTypeRegistry.register(DateTimeColumnPlugin);
  ColumnTypeRegistry.register(TimeColumnPlugin);
  ColumnTypeRegistry.register(EmailColumnPlugin);
  ColumnTypeRegistry.register(UrlColumnPlugin);
  ColumnTypeRegistry.register(PhoneColumnPlugin);
  ColumnTypeRegistry.register(ColorColumnPlugin);
  ColumnTypeRegistry.register(RatingColumnPlugin);
  ColumnTypeRegistry.register(ProgressColumnPlugin);
  ColumnTypeRegistry.register(SparklineColumnPlugin);
  ColumnTypeRegistry.register(ActionColumnPlugin);
  ColumnTypeRegistry.register(PdfColumnPlugin);

  initialized = true;
}
