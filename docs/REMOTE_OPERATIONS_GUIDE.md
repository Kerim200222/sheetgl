# Remote Operations & Enterprise REST DTO Guide

SheetGL is natively designed to operate over datasets with millions of rows by delegating pagination, sorting, filtering, and grouping to server-side endpoints using a **Standard Enterprise REST DTO convention**.

---

## 1. How RemoteDataStore Communicates

When virtual scrolling occurs or when the user changes filters, `RemoteDataStore` constructs HTTP GET requests with URL-encoded query parameters:

```
GET /api/v1/customers?skip=0&take=100&sort=[{"selector":"balance","desc":true}]&filter=[["createdAt","between",["2026-06-01","2026-06-30"]],"and",["progress","<",35]]
```

### Request Query Parameters

| Parameter | Type | Example | Description |
| :--- | :--- | :--- | :--- |
| `skip` | `number` | `100` | The number of records to skip (paging offset). |
| `take` | `number` | `50` | The number of records to return (page size). |
| `sort` | `JSON string` | `[{"selector":"name","desc":false}]` | Array of sort criteria. |
| `filter` | `JSON string` | `["status","=","active"]` | Standard binary or composite AST filter expressions. |
| `group` | `JSON string` | `[{"selector":"city","isExpanded":false}]` | Grouping criteria. |
| `requireTotalCount`| `boolean` | `true` | Requests the total count of matching records across all pages. |

---

## 2. Server Response JSON Format

Your API endpoint should return a JSON response formatted as follows:

```json
{
  "data": [
    { "id": 101, "name": "Acme Global", "balance": 45000.0, "status": "active" },
    { "id": 102, "name": "Nexus Cloud", "balance": 72500.0, "status": "active" }
  ],
  "totalCount": 289,
  "unfilteredTotalCount": 10000,
  "summary": {
    "balance": 1102500.0
  }
}
```

---

## 3. Context-Aware Distinct Values & Semantic Date Tree Endpoint (`/distinct`)

When a user opens the header filter menu on any column, `RemoteDataStore.getDistinctValues(columnId, search, baseFilter)` queries your `/distinct` endpoint and forwards the composite `filter` of all **other** active columns (`baseFilter`) so that preview row counts (`Uygula (289)`) always match the exact intersection of active filters:

```
GET /api/v1/customers/distinct?field=progress&filter=["createdAt","between",["2026-06-01","2026-06-30"]]
```

### 3.1. Flat Distinct Values Response
```json
[
  { "value": 14, "label": "%14", "count": 48 },
  { "value": 28, "label": "%28", "count": 52 }
]
```

### 3.2. Semantic Date Hierarchy (`Yıl > Ay > Gün`) Response & AST Compilation
For `date` and `datetime` columns, the `/distinct` endpoint may return either ISO date items (`{ "value": "2026-06-15", "count": 12 }`) or a nested `Year > Month > Day` tree:

```json
[
  {
    "year": 2026,
    "count": 833,
    "months": [
      {
        "month": 6,
        "count": 289,
        "days": [
          { "day": 15, "isoDate": "2026-06-15", "count": 28 }
        ]
      }
    ]
  }
]
```

When the user selects full years, full months, or specific days in the Semantic Date Tree (`Yıl > Ay > Gün`), SheetGL compiles the selection into a compact AST `semanticFilter` expression instead of sending thousands of raw timestamp strings:
- **Full Year Checked (`2026`):** `["createdAt", "between", ["2026-01-01", "2026-12-31"]]`
- **Full Month Checked (`Haziran 2026`):** `["createdAt", "between", ["2026-06-01", "2026-06-30"]]`
- **Specific Days Checked:** `["createdAt", "in", ["2026-06-15", "2026-06-16"]]`

---

## 4. Client-Side Setup

```tsx
import React, { useMemo } from 'react';
import { SheetGL, RemoteDataStore, ColumnDef } from 'sheetgl';

export function RemoteCustomersGrid() {
  const remoteStore = useMemo(() => new RemoteDataStore({
    url: 'https://api.yourdomain.com/v1/customers',
    keyField: 'id',
    chunkSize: 100, // Prefetch size for LRU caching
    remoteOperations: {
      paging: true,
      sorting: true,
      filtering: true,
      grouping: false,
    },
  }), []);

  const columns: ColumnDef[] = useMemo(() => [
    { id: 'id', title: 'ID', type: 'number', width: 80, sortable: true },
    { id: 'name', title: 'Customer Name', type: 'text', width: 250, sortable: true, filterable: true },
    { id: 'createdAt', title: 'Transaction Date', type: 'datetime', width: 170, sortable: true, filterable: true },
    { id: 'balance', title: 'Balance', type: 'currency', width: 140, sortable: true },
  ], []);

  return <SheetGL dataSource={remoteStore} columns={columns} />;
}
```

---

## 5. Backend Implementation Examples

### 5.1. Node.js (Express + TypeScript + SQL)

```typescript
import express, { Request, Response } from 'express';
import { db } from './database';

const app = express();

app.get('/api/v1/customers', async (req: Request, res: Response) => {
  const skip = parseInt(req.query.skip as string) || 0;
  const take = parseInt(req.query.take as string) || 50;
  const sortParam = req.query.sort ? JSON.parse(req.query.sort as string) : [];
  const filterParam = req.query.filter ? JSON.parse(req.query.filter as string) : null;

  let query = db('customers');
  let countQuery = db('customers');

  // 1. Apply Filtering
  if (filterParam && Array.isArray(filterParam)) {
    const [field, op, value] = filterParam;
    if (op === '=') {
      query = query.where(field, value);
      countQuery = countQuery.where(field, value);
    } else if (op === 'between' && Array.isArray(value)) {
      query = query.whereBetween(field, [value[0], value[1]]);
      countQuery = countQuery.whereBetween(field, [value[0], value[1]]);
    } else if (op === 'contains') {
      query = query.whereILike(field, `%${value}%`);
      countQuery = countQuery.whereILike(field, `%${value}%`);
    }
  }

  // 2. Apply Sorting
  if (sortParam.length > 0) {
    for (const rule of sortParam) {
      query = query.orderBy(rule.selector, rule.desc ? 'desc' : 'asc');
    }
  } else {
    query = query.orderBy('id', 'asc');
  }

  // 3. Apply Pagination
  const [data, [{ totalCount }]] = await Promise.all([
    query.offset(skip).limit(take),
    countQuery.count('* as totalCount'),
  ]);

  res.json({
    data,
    totalCount: Number(totalCount),
  });
});
```

### 5.2. ASP.NET Core (.NET 8/9 with DataSourceLoader)

`RemoteDataStore` seamlessly integrates with ASP.NET Core data loaders:

```csharp
[HttpGet]
public async Task<IActionResult> Get(DataSourceLoadOptions loadOptions)
{
    var customers = _context.Customers;
    var loadResult = await DataSourceLoader.LoadAsync(customers, loadOptions);
    return Ok(loadResult);
}
```

### 5.3. Python (FastAPI + SQLAlchemy)

```python
import json
from fastapi import FastAPI, Query
from sqlalchemy import select, func
from database import async_session, Customer

app = FastAPI()

@app.get("/api/v1/customers")
async def get_customers(
    skip: int = 0,
    take: int = 50,
    sort: str = Query(default=None),
    filter: str = Query(default=None)
):
    async with async_session() as session:
        query = select(Customer)
        count_query = select(func.count(Customer.id))

        # Filter evaluation
        if filter:
            f_expr = json.loads(filter)
            if f_expr[1] == "=":
                query = query.where(getattr(Customer, f_expr[0]) == f_expr[2])
                count_query = count_query.where(getattr(Customer, f_expr[0]) == f_expr[2])

        # Pagination & Execution
        query = query.offset(skip).limit(take)
        result = await session.execute(query)
        total = await session.scalar(count_query)

        return {
            "data": [row.to_dict() for row in result.scalars().all()],
            "totalCount": total
        }
```
