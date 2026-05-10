"use client";

import {
  useTableStore,
  FIELD_TYPE_ICONS,
  type FieldType,
  SELECT_COLORS,
} from "@/lib/table-store";

const FIELD_TYPE_OPTIONS: { type: FieldType; label: string }[] = [
  { type: "text", label: "文本" },
  { type: "longText", label: "多行文本" },
  { type: "number", label: "数字" },
  { type: "select", label: "单选" },
  { type: "multiSelect", label: "多选" },
  { type: "date", label: "日期" },
  { type: "checkbox", label: "勾选" },
  { type: "url", label: "链接" },
  { type: "email", label: "邮箱" },
  { type: "phone", label: "电话" },
  { type: "progress", label: "进度" },
  { type: "rating", label: "评分" },
];

interface TableToolbarProps {
  documentId: string;
}

export default function TableToolbar({ documentId }: TableToolbarProps) {
  const { fields, records, addField, addRecord, selectedCell, deleteRecord } =
    useTableStore();

  const handleAddField = () => {
    const name = `字段${fields.length + 1}`;
    addField({
      name,
      type: "text",
      width: 180,
      visible: true,
    });
  };

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
      {/* 添加记录 */}
      <button
        onClick={addRecord}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-md hover:opacity-90 transition-opacity"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        添加记录
      </button>

      {/* 添加字段 */}
      <button
        onClick={handleAddField}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-gray-200 dark:border-gray-700 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <svg
          className="w-3.5 h-3.5"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        添加字段
      </button>

      {/* 删除选中记录 */}
      {selectedCell && (
        <button
          onClick={() => {
            deleteRecord(selectedCell.recordId);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-md hover:bg-red-50 transition-colors"
        >
          <svg
            className="w-3.5 h-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
          删除记录
        </button>
      )}

      {/* 分隔 */}
      <div className="flex-1" />

      {/* 统计 */}
      <span className="text-xs text-gray-400">
        {records.length} 条记录 · {fields.length} 个字段
      </span>
    </div>
  );
}

// ---- 字段配置面板 ----

export function FieldConfigPanel({
  fieldId,
  onClose,
}: {
  fieldId: string;
  onClose: () => void;
}) {
  const { fields, updateField, deleteField } = useTableStore();
  const field = fields.find((f) => f.id === fieldId);

  if (!field) return null;

  return (
    <div className="absolute z-50 top-10 right-0 w-64 bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="p-3 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-medium">字段配置</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        {/* 字段名 */}
        <div>
          <label className="text-xs text-gray-500">字段名</label>
          <input
            defaultValue={field.name}
            onBlur={(e) => updateField(fieldId, { name: e.target.value })}
            className="mt-1 w-full px-2 py-1 text-sm border border-gray-200 dark:border-gray-700 rounded bg-transparent"
          />
        </div>

        {/* 字段类型 */}
        <div>
          <label className="text-xs text-gray-500">类型</label>
          <div className="mt-1 grid grid-cols-3 gap-1">
            {FIELD_TYPE_OPTIONS.map((opt) => (
              <button
                key={opt.type}
                onClick={() => updateField(fieldId, { type: opt.type })}
                className={`px-2 py-1 text-xs rounded border transition-colors ${
                  field.type === opt.type
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                {FIELD_TYPE_ICONS[opt.type]} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 单选/多选选项管理 */}
        {(field.type === "select" || field.type === "multiSelect") && (
          <div>
            <label className="text-xs text-gray-500">选项</label>
            <div className="mt-1 space-y-1">
              {(field.options || []).map((opt, idx) => (
                <div key={opt.id} className="flex items-center gap-1">
                  <span
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: opt.color }}
                  />
                  <input
                    defaultValue={opt.label}
                    onBlur={(e) => {
                      const newOptions = [...(field.options || [])];
                      newOptions[idx] = {
                        ...newOptions[idx],
                        label: e.target.value,
                      };
                      updateField(fieldId, { options: newOptions });
                    }}
                    className="flex-1 px-1 py-0.5 text-xs border border-gray-200 rounded bg-transparent"
                  />
                  <button
                    onClick={() => {
                      const newOptions = (field.options || []).filter(
                        (_, i) => i !== idx,
                      );
                      updateField(fieldId, { options: newOptions });
                    }}
                    className="text-gray-400 hover:text-red-500 text-xs"
                  >
                    ✕
                  </button>
                </div>
              ))}
              <button
                onClick={() => {
                  const colorIdx =
                    (field.options || []).length % SELECT_COLORS.length;
                  const newOption = {
                    id: `opt_${Date.now()}`,
                    label: `选项${(field.options || []).length + 1}`,
                    color: SELECT_COLORS[colorIdx],
                  };
                  updateField(fieldId, {
                    options: [...(field.options || []), newOption],
                  });
                }}
                className="text-xs text-primary hover:underline"
              >
                + 添加选项
              </button>
            </div>
          </div>
        )}

        {/* 列宽 */}
        <div>
          <label className="text-xs text-gray-500">列宽: {field.width}px</label>
          <input
            type="range"
            min={80}
            max={400}
            value={field.width}
            onChange={(e) =>
              updateField(fieldId, { width: Number(e.target.value) })
            }
            className="mt-1 w-full"
          />
        </div>

        {/* 删除字段 */}
        <button
          onClick={() => {
            deleteField(fieldId);
            onClose();
          }}
          className="w-full py-1.5 text-xs text-red-500 border border-red-200 rounded hover:bg-red-50 transition-colors"
        >
          删除此字段
        </button>
      </div>
    </div>
  );
}
