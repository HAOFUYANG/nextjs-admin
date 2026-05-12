"use client";

import * as Y from "yjs";
import {
  useTableStore,
  type FieldConfig,
  type RecordData,
} from "@/lib/table-store";

/**
 * 表格 Yjs 绑定（MVP 粗粒度版）
 *
 * 数据结构：ydoc.getMap('table')
 *   - fields: string  (JSON.stringify(FieldConfig[]))
 *   - records: string (JSON.stringify(RecordData[]))
 *
 * 同步链路：
 *   - store 变更 → tableMap.set('fields'|'records', JSON)（标 origin='local-store'）
 *   - tableMap 变更（origin !== 'local-store'）→ store.loadData(...)
 *
 * 注：粗粒度策略下，多人并发改不同字段会以"最后写入者胜出"。
 *     后续可改造为 Y.Array<Y.Map> 细粒度结构以利用 CRDT 合并能力。
 */

const TABLE_MAP_KEY = "table";
const FIELDS_KEY = "fields";
const RECORDS_KEY = "records";
const LOCAL_ORIGIN = "local-store";

export interface TableSnapshot {
  fields: FieldConfig[];
  records: RecordData[];
}

export interface BindOptions {
  /** 远程为空时是否用本地默认数据 seed */
  seedIfEmpty?: TableSnapshot | null;
}

export interface TableYjsBinding {
  /** 解除绑定，停止同步 */
  unbind: () => void;
  /** 当前 ydoc 是否包含表格数据 */
  hasRemoteData: () => boolean;
}

/**
 * 将 ydoc.getMap('table') 与 useTableStore 双向绑定
 *
 * 调用方需要保证：在 provider 完成首次 sync 之后再调用本函数，
 * 否则可能用本地默认数据覆盖远程已存在数据。
 */
export function bindTableStoreToYDoc(
  ydoc: Y.Doc,
  options: BindOptions = {},
): TableYjsBinding {
  const tableMap = ydoc.getMap<string>(TABLE_MAP_KEY);

  let applyingRemote = false;
  let lastFieldsJson = "";
  let lastRecordsJson = "";

  const readRemote = (): TableSnapshot | null => {
    const fRaw = tableMap.get(FIELDS_KEY);
    const rRaw = tableMap.get(RECORDS_KEY);
    if (!fRaw || !rRaw) return null;
    try {
      const fields = JSON.parse(fRaw) as FieldConfig[];
      const records = JSON.parse(rRaw) as RecordData[];
      if (Array.isArray(fields) && Array.isArray(records)) {
        return { fields, records };
      }
    } catch {
      // ignore
    }
    return null;
  };

  // ---- 初始化：远程优先，否则本地 seed ----
  const remote = readRemote();
  if (remote) {
    applyingRemote = true;
    useTableStore.getState().loadData(remote);
    lastFieldsJson = tableMap.get(FIELDS_KEY) || "";
    lastRecordsJson = tableMap.get(RECORDS_KEY) || "";
    applyingRemote = false;
  } else if (options.seedIfEmpty) {
    const seed = options.seedIfEmpty;
    applyingRemote = true;
    useTableStore.getState().loadData(seed);
    applyingRemote = false;
    // 把 seed 写回 ydoc，让其他客户端也能拿到
    const fJson = JSON.stringify(seed.fields);
    const rJson = JSON.stringify(seed.records);
    ydoc.transact(() => {
      tableMap.set(FIELDS_KEY, fJson);
      tableMap.set(RECORDS_KEY, rJson);
    }, LOCAL_ORIGIN);
    lastFieldsJson = fJson;
    lastRecordsJson = rJson;
  }

  // ---- 远程 → 本地 ----
  const yObserver = (
    event: Y.YMapEvent<string>,
    transaction: Y.Transaction,
  ) => {
    if (transaction.origin === LOCAL_ORIGIN) return;
    const snap = readRemote();
    if (!snap) return;

    const fJson = tableMap.get(FIELDS_KEY) || "";
    const rJson = tableMap.get(RECORDS_KEY) || "";
    if (fJson === lastFieldsJson && rJson === lastRecordsJson) return;

    applyingRemote = true;
    try {
      // 仅替换 fields/records，不重置 UI 状态（避免远程更新清掉本地选中/编辑）
      useTableStore.setState({
        fields: snap.fields,
        records: snap.records,
      });
      lastFieldsJson = fJson;
      lastRecordsJson = rJson;
    } finally {
      applyingRemote = false;
    }
    void event;
  };
  tableMap.observe(yObserver);

  // ---- 本地 → 远程 ----
  const unsubStore = useTableStore.subscribe((state, prev) => {
    if (applyingRemote) return;
    if (state.fields === prev.fields && state.records === prev.records) return;

    const fJson =
      state.fields === prev.fields
        ? lastFieldsJson
        : JSON.stringify(state.fields);
    const rJson =
      state.records === prev.records
        ? lastRecordsJson
        : JSON.stringify(state.records);

    if (fJson === lastFieldsJson && rJson === lastRecordsJson) return;

    ydoc.transact(() => {
      if (fJson !== lastFieldsJson) tableMap.set(FIELDS_KEY, fJson);
      if (rJson !== lastRecordsJson) tableMap.set(RECORDS_KEY, rJson);
    }, LOCAL_ORIGIN);

    lastFieldsJson = fJson;
    lastRecordsJson = rJson;
  });

  return {
    unbind: () => {
      tableMap.unobserve(yObserver);
      unsubStore();
    },
    hasRemoteData: () => readRemote() !== null,
  };
}

/** 把 ydoc 中的表格数据转为 TableSnapshot（不存在则 null） */
export function readTableSnapshot(ydoc: Y.Doc): TableSnapshot | null {
  const tableMap = ydoc.getMap<string>(TABLE_MAP_KEY);
  const fRaw = tableMap.get(FIELDS_KEY);
  const rRaw = tableMap.get(RECORDS_KEY);
  if (!fRaw || !rRaw) return null;
  try {
    const fields = JSON.parse(fRaw) as FieldConfig[];
    const records = JSON.parse(rRaw) as RecordData[];
    if (Array.isArray(fields) && Array.isArray(records)) {
      return { fields, records };
    }
  } catch {
    // ignore
  }
  return null;
}
