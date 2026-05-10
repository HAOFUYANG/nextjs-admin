import { create } from "zustand";

// ---- 类型定义 ----

export type FieldType =
  | "text"
  | "longText"
  | "number"
  | "select"
  | "multiSelect"
  | "date"
  | "checkbox"
  | "url"
  | "email"
  | "phone"
  | "progress"
  | "rating";

export interface SelectOption {
  id: string;
  label: string;
  color: string; // 背景色 #hex
}

export interface FieldConfig {
  id: string;
  name: string;
  type: FieldType;
  width: number;
  options?: SelectOption[];
  visible: boolean;
}

export type CellValue = string | number | boolean | null | SelectOption[];

export interface RecordData {
  id: string;
  values: Record<string, CellValue>; // fieldId → value
  createdAt: string;
}

export interface CellPosition {
  recordId: string;
  fieldId: string;
}

// ---- 布局常量 ----

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 44;
const ROW_NUMBER_WIDTH = 60;
const DEFAULT_COL_WIDTH = 180;

// ---- 字段类型图标（用于 Canvas 绘制） ----

export const FIELD_TYPE_ICONS: Record<FieldType, string> = {
  text: "Aa",
  longText: "¶",
  number: "#",
  select: "◉",
  multiSelect: "◉◉",
  date: "📅",
  checkbox: "☑",
  url: "🔗",
  email: "✉",
  phone: "📞",
  progress: "%",
  rating: "★",
};

// ---- 预定义单选颜色 ----

export const SELECT_COLORS = [
  "#E2F0D9", // 浅绿
  "#D9E1F2", // 浅蓝
  "#FCE4D6", // 浅橙
  "#E2D9F2", // 浅紫
  "#FFF2CC", // 浅黄
  "#D6EEF0", // 浅青
  "#F2D9D9", // 浅红
  "#D9F2E2", // 薄荷
];

// ---- 示例数据 ----

const SAMPLE_FIELDS: FieldConfig[] = [
  {
    id: "f1",
    name: "任务名称",
    type: "text",
    width: 200,
    visible: true,
  },
  {
    id: "f2",
    name: "状态",
    type: "select",
    width: 140,
    visible: true,
    options: [
      { id: "s1", label: "待开始", color: "#FFF2CC" },
      { id: "s2", label: "进行中", color: "#D9E1F2" },
      { id: "s3", label: "已完成", color: "#E2F0D9" },
      { id: "s4", label: "已取消", color: "#F2D9D9" },
    ],
  },
  {
    id: "f3",
    name: "优先级",
    type: "select",
    width: 120,
    visible: true,
    options: [
      { id: "p1", label: "高", color: "#FCE4D6" },
      { id: "p2", label: "中", color: "#FFF2CC" },
      { id: "p3", label: "低", color: "#E2F0D9" },
    ],
  },
  {
    id: "f4",
    name: "负责人",
    type: "text",
    width: 140,
    visible: true,
  },
  {
    id: "f5",
    name: "截止日期",
    type: "date",
    width: 150,
    visible: true,
  },
  {
    id: "f6",
    name: "已完成",
    type: "checkbox",
    width: 90,
    visible: true,
  },
  {
    id: "f7",
    name: "预算",
    type: "number",
    width: 120,
    visible: true,
  },
  {
    id: "f8",
    name: "链接",
    type: "url",
    width: 200,
    visible: true,
  },
  {
    id: "f9",
    name: "标签",
    type: "multiSelect",
    width: 200,
    visible: true,
    options: [
      { id: "t1", label: "前端", color: "#D9E1F2" },
      { id: "t2", label: "后端", color: "#E2F0D9" },
      { id: "t3", label: "设计", color: "#E2D9F2" },
      { id: "t4", label: "运维", color: "#FFF2CC" },
      { id: "t5", label: "测试", color: "#FCE4D6" },
    ],
  },
  {
    id: "f10",
    name: "完成度",
    type: "progress",
    width: 140,
    visible: true,
  },
  {
    id: "f11",
    name: "重要性",
    type: "rating",
    width: 140,
    visible: true,
  },
];

const SAMPLE_RECORDS: RecordData[] = [
  {
    id: "r1",
    values: {
      f1: "设计登录页面",
      f2: [{ id: "s2", label: "进行中", color: "#D9E1F2" }],
      f3: [{ id: "p1", label: "高", color: "#FCE4D6" }],
      f4: "张三",
      f5: "2026-05-15",
      f6: false,
      f7: 5000,
      f8: "https://figma.com/design",
      f9: [
        { id: "t1", label: "前端", color: "#D9E1F2" },
        { id: "t3", label: "设计", color: "#E2D9F2" },
      ],
      f10: 60,
      f11: 4,
    },
    createdAt: "2026-05-01",
  },
  {
    id: "r2",
    values: {
      f1: "开发 API 接口",
      f2: [{ id: "s1", label: "待开始", color: "#FFF2CC" }],
      f3: [{ id: "p1", label: "高", color: "#FCE4D6" }],
      f4: "李四",
      f5: "2026-05-20",
      f6: false,
      f7: 8000,
      f8: "",
      f9: [{ id: "t2", label: "后端", color: "#E2F0D9" }],
      f10: 20,
      f11: 5,
    },
    createdAt: "2026-05-01",
  },
  {
    id: "r3",
    values: {
      f1: "编写测试用例",
      f2: [{ id: "s3", label: "已完成", color: "#E2F0D9" }],
      f3: [{ id: "p2", label: "中", color: "#FFF2CC" }],
      f4: "王五",
      f5: "2026-05-10",
      f6: true,
      f7: 3000,
      f8: "",
      f9: [{ id: "t5", label: "测试", color: "#FCE4D6" }],
      f10: 100,
      f11: 3,
    },
    createdAt: "2026-05-01",
  },
  {
    id: "r4",
    values: {
      f1: "部署到测试环境",
      f2: [{ id: "s1", label: "待开始", color: "#FFF2CC" }],
      f3: [{ id: "p3", label: "低", color: "#E2F0D9" }],
      f4: "赵六",
      f5: "2026-05-25",
      f6: false,
      f7: 2000,
      f8: "",
      f9: [{ id: "t4", label: "运维", color: "#FFF2CC" }],
      f10: 10,
      f11: 2,
    },
    createdAt: "2026-05-01",
  },
  {
    id: "r5",
    values: {
      f1: "用户反馈收集",
      f2: [{ id: "s2", label: "进行中", color: "#D9E1F2" }],
      f3: [{ id: "p2", label: "中", color: "#FFF2CC" }],
      f4: "张三",
      f5: "2026-06-01",
      f6: false,
      f7: 1500,
      f8: "",
      f9: [
        { id: "t1", label: "前端", color: "#D9E1F2" },
        { id: "t2", label: "后端", color: "#E2F0D9" },
      ],
      f10: 40,
      f11: 3,
    },
    createdAt: "2026-05-02",
  },
  {
    id: "r6",
    values: {
      f1: "数据库优化",
      f2: [{ id: "s3", label: "已完成", color: "#E2F0D9" }],
      f3: [{ id: "p1", label: "高", color: "#FCE4D6" }],
      f4: "李四",
      f5: "2026-05-08",
      f6: true,
      f7: 4000,
      f8: "",
      f9: [{ id: "t2", label: "后端", color: "#E2F0D9" }],
      f10: 100,
      f11: 5,
    },
    createdAt: "2026-05-01",
  },
  {
    id: "r7",
    values: {
      f1: "安全审计",
      f2: [{ id: "s1", label: "待开始", color: "#FFF2CC" }],
      f3: [{ id: "p1", label: "高", color: "#FCE4D6" }],
      f4: "王五",
      f5: "2026-06-10",
      f6: false,
      f7: 10000,
      f8: "",
      f9: [
        { id: "t2", label: "后端", color: "#E2F0D9" },
        { id: "t4", label: "运维", color: "#FFF2CC" },
      ],
      f10: 5,
      f11: 5,
    },
    createdAt: "2026-05-02",
  },
  {
    id: "r8",
    values: {
      f1: "文档编写",
      f2: [{ id: "s2", label: "进行中", color: "#D9E1F2" }],
      f3: [{ id: "p3", label: "低", color: "#E2F0D9" }],
      f4: "赵六",
      f5: "2026-06-15",
      f6: false,
      f7: 1000,
      f8: "",
      f9: [],
      f10: 35,
      f11: 2,
    },
    createdAt: "2026-05-02",
  },
  {
    id: "r9",
    values: {
      f1: "性能监控接入",
      f2: [{ id: "s4", label: "已取消", color: "#F2D9D9" }],
      f3: [{ id: "p2", label: "中", color: "#FFF2CC" }],
      f4: "张三",
      f5: "",
      f6: false,
      f7: 0,
      f8: "",
      f9: [],
      f10: 0,
      f11: 1,
    },
    createdAt: "2026-05-01",
  },
  {
    id: "r10",
    values: {
      f1: "CI/CD 流水线搭建",
      f2: [{ id: "s3", label: "已完成", color: "#E2F0D9" }],
      f3: [{ id: "p2", label: "中", color: "#FFF2CC" }],
      f4: "李四",
      f5: "2026-05-05",
      f6: true,
      f7: 2500,
      f8: "https://github.com/actions",
      f9: [{ id: "t4", label: "运维", color: "#FFF2CC" }],
      f10: 100,
      f11: 4,
    },
    createdAt: "2026-05-01",
  },
];

export interface SortConfig {
  fieldId: string;
  direction: "asc" | "desc";
}

export interface FilterConfig {
  fieldId: string;
  type: "contains" | "equals" | "notEmpty" | "empty";
  value: string;
}

// ---- Store ----

interface TableState {
  // 数据
  fields: FieldConfig[];
  records: RecordData[];

  // 排序/筛选
  sortConfig: SortConfig | null;
  filterConfigs: FilterConfig[];

  // UI 状态
  selectedCell: CellPosition | null;
  editingCell: CellPosition | null;
  hoverCell: CellPosition | null;
  scrollOffset: { x: number; y: number };
  headerMenuFieldId: string | null;

  // 布局常量
  ROW_HEIGHT: number;
  HEADER_HEIGHT: number;
  ROW_NUMBER_WIDTH: number;
  DEFAULT_COL_WIDTH: number;

  // Actions
  addField: (field: Omit<FieldConfig, "id">) => void;
  updateField: (id: string, partial: Partial<FieldConfig>) => void;
  deleteField: (id: string) => void;
  addRecord: () => void;
  deleteRecord: (id: string) => void;
  updateCell: (recordId: string, fieldId: string, value: CellValue) => void;
  setScrollOffset: (offset: { x: number; y: number }) => void;
  setSelectedCell: (cell: CellPosition | null) => void;
  setEditingCell: (cell: CellPosition | null) => void;
  setHoverCell: (cell: CellPosition | null) => void;
  setHeaderMenuFieldId: (fieldId: string | null) => void;
  setSortConfig: (config: SortConfig | null) => void;
  addFilter: (filter: FilterConfig) => void;
  removeFilter: (fieldId: string) => void;
  updateFilter: (fieldId: string, partial: Partial<FilterConfig>) => void;
  clearFilters: () => void;
}

export const useTableStore = create<TableState>((set, get) => ({
  fields: SAMPLE_FIELDS,
  records: SAMPLE_RECORDS,

  sortConfig: null,
  filterConfigs: [],

  selectedCell: null,
  editingCell: null,
  hoverCell: null,
  scrollOffset: { x: 0, y: 0 },
  headerMenuFieldId: null,

  ROW_HEIGHT,
  HEADER_HEIGHT,
  ROW_NUMBER_WIDTH,
  DEFAULT_COL_WIDTH,

  addField: (field) =>
    set((state) => ({
      fields: [...state.fields, { ...field, id: `f${Date.now()}` }],
    })),

  updateField: (id, partial) =>
    set((state) => ({
      fields: state.fields.map((f) => (f.id === id ? { ...f, ...partial } : f)),
    })),

  deleteField: (id) =>
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== id),
      records: state.records.map((r) => {
        const { [id]: _, ...rest } = r.values;
        return { ...r, values: rest };
      }),
    })),

  addRecord: () =>
    set((state) => {
      const id = `r${Date.now()}`;
      const values: Record<string, CellValue> = {};
      state.fields.forEach((f) => {
        switch (f.type) {
          case "text":
          case "longText":
          case "url":
          case "email":
          case "phone":
            values[f.id] = "";
            break;
          case "number":
            values[f.id] = 0;
            break;
          case "checkbox":
            values[f.id] = false;
            break;
          case "select":
          case "multiSelect":
            values[f.id] = [];
            break;
          case "date":
            values[f.id] = "";
            break;
          case "progress":
            values[f.id] = 0;
            break;
          case "rating":
            values[f.id] = 0;
            break;
          default:
            values[f.id] = null;
        }
      });
      return {
        records: [
          ...state.records,
          { id, values, createdAt: new Date().toISOString() },
        ],
      };
    }),

  deleteRecord: (id) =>
    set((state) => ({
      records: state.records.filter((r) => r.id !== id),
    })),

  updateCell: (recordId, fieldId, value) =>
    set((state) => ({
      records: state.records.map((r) =>
        r.id === recordId
          ? { ...r, values: { ...r.values, [fieldId]: value } }
          : r,
      ),
    })),

  setScrollOffset: (offset) => set({ scrollOffset: offset }),
  setSelectedCell: (cell) => set({ selectedCell: cell }),
  setEditingCell: (cell) => set({ editingCell: cell }),
  setHoverCell: (cell) => set({ hoverCell: cell }),
  setHeaderMenuFieldId: (fieldId) => set({ headerMenuFieldId: fieldId }),
  setSortConfig: (config) => set({ sortConfig: config }),
  addFilter: (filter) =>
    set((state) => ({
      filterConfigs: [...state.filterConfigs, filter],
    })),
  removeFilter: (fieldId) =>
    set((state) => ({
      filterConfigs: state.filterConfigs.filter((f) => f.fieldId !== fieldId),
    })),
  updateFilter: (fieldId, partial) =>
    set((state) => ({
      filterConfigs: state.filterConfigs.map((f) =>
        f.fieldId === fieldId ? { ...f, ...partial } : f,
      ),
    })),
  clearFilters: () => set({ filterConfigs: [] }),
}));

// ---- Selector 函数 ----

export function selectVisibleFields(state: TableState): FieldConfig[] {
  return state.fields.filter((f) => f.visible);
}

export function selectSortedRecords(state: TableState): RecordData[] {
  const { records, fields, sortConfig, filterConfigs } = state;
  let result = [...records];

  // 筛选
  for (const fc of filterConfigs) {
    result = result.filter((r) => {
      const v = r.values[fc.fieldId];
      switch (fc.type) {
        case "contains":
          return String(v ?? "")
            .toLowerCase()
            .includes(fc.value.toLowerCase());
        case "equals":
          return String(v ?? "") === fc.value;
        case "notEmpty":
          return (
            v !== null &&
            v !== undefined &&
            v !== "" &&
            !(Array.isArray(v) && v.length === 0)
          );
        case "empty":
          return (
            v === null ||
            v === undefined ||
            v === "" ||
            (Array.isArray(v) && v.length === 0)
          );
        default:
          return true;
      }
    });
  }

  // 排序
  if (sortConfig) {
    const dir = sortConfig.direction === "asc" ? 1 : -1;
    result.sort((a, b) => {
      const va = a.values[sortConfig.fieldId];
      const vb = b.values[sortConfig.fieldId];
      if (va == null && vb == null) return 0;
      if (va == null) return dir;
      if (vb == null) return -dir;
      if (typeof va === "number" && typeof vb === "number")
        return (va - vb) * dir;
      return String(va).localeCompare(String(vb)) * dir;
    });
  }

  return result;
}
