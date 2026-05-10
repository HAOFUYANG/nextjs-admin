"use client";

import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import {
  useTableStore,
  selectVisibleFields,
  selectSortedRecords,
  FIELD_TYPE_ICONS,
  type FieldConfig,
  type CellValue,
  type SelectOption,
  type CellPosition,
  type SortConfig,
  type FilterConfig,
} from "@/lib/table-store";
import TableToolbar from "./TableToolbar";

// ---- 颜色常量 ----

const COLORS = {
  headerBg: "#f8f9fb",
  headerBorder: "#e2e5ea",
  gridLine: "#eef0f4",
  rowBg: "#ffffff",
  rowBgAlt: "#fafbfc",
  rowHover: "#f0f5ff",
  cellSelected: "#e8f0fe",
  cellSelectedBorder: "#1a73e8",
  text: "#1f2329",
  textSecondary: "#8f959e",
  textMuted: "#c4c7cc",
  selectTagText: "#1f2329",
  checkbox: "#1a73e8",
  rowNumber: "#8f959e",
};

// ---- 字体 ----

const FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

// ---- 工具函数 ----

function getTextWidth(ctx: CanvasRenderingContext2D, text: string): number {
  return ctx.measureText(text).width;
}

function truncateText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (getTextWidth(ctx, text) <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && getTextWidth(ctx, t + "…") > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + "…";
}

// ---- Canvas 渲染器 ----

class TableRenderer {
  private ctx: CanvasRenderingContext2D;
  private _dpr: number;

  constructor(ctx: CanvasRenderingContext2D, dpr: number) {
    this.ctx = ctx;
    this._dpr = dpr;
  }

  set dpr(val: number) {
    this._dpr = val;
  }

  get dpr() {
    return this._dpr;
  }

  clear(width: number, height: number) {
    this.ctx.clearRect(0, 0, width * this.dpr, height * this.dpr);
  }

  /** 计算可视范围 */
  getVisibleRange(
    scrollX: number,
    scrollY: number,
    canvasWidth: number,
    canvasHeight: number,
    fields: FieldConfig[],
    records: { id: string }[],
    rowHeight: number,
    headerHeight: number,
    rowNumberWidth: number,
  ) {
    // 列范围
    let startCol = 0;
    let accX = rowNumberWidth;
    for (let i = 0; i < fields.length; i++) {
      if (accX + fields[i].width > scrollX) {
        startCol = i;
        break;
      }
      accX += fields[i].width;
    }
    let endCol = fields.length - 1;
    let accX2 = rowNumberWidth;
    for (let i = 0; i < fields.length; i++) {
      accX2 += fields[i].width;
      if (accX2 > scrollX + canvasWidth) {
        endCol = i;
        break;
      }
    }

    // 行范围
    const bodyHeight = canvasHeight - headerHeight;
    const startRow = Math.max(0, Math.floor(scrollY / rowHeight));
    const endRow = Math.min(
      records.length - 1,
      Math.ceil((scrollY + bodyHeight) / rowHeight),
    );

    return { startCol, endCol, startRow, endRow };
  }

  /** 获取列的 X 偏移（含行号列） */
  getColX(
    fields: FieldConfig[],
    colIndex: number,
    rowNumberWidth: number,
  ): number {
    let x = rowNumberWidth;
    for (let i = 0; i < colIndex; i++) {
      x += fields[i].width;
    }
    return x;
  }

  /** 绘制表头 */
  drawHeader(
    fields: FieldConfig[],
    scrollX: number,
    canvasWidth: number,
    headerHeight: number,
    rowNumberWidth: number,
    hoverFieldId: string | null,
    sortConfig: SortConfig | null,
    filterConfigs: FilterConfig[],
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 表头背景
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, 0, canvasWidth, headerHeight);

    // 行号列表头
    ctx.fillStyle = COLORS.headerBg;
    ctx.fillRect(0, 0, rowNumberWidth, headerHeight);
    ctx.strokeStyle = COLORS.headerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(rowNumberWidth + 0.5, 0);
    ctx.lineTo(rowNumberWidth + 0.5, headerHeight);
    ctx.stroke();

    // 各字段列表头
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const x = this.getColX(fields, i, rowNumberWidth) - scrollX;
      if (x + field.width < rowNumberWidth || x > canvasWidth) continue;

      // hover 高亮
      if (hoverFieldId === field.id) {
        ctx.fillStyle = "#eef2ff";
        ctx.fillRect(x, 0, field.width, headerHeight);
      }

      // 字段类型图标
      ctx.font = `11px ${FONT_FAMILY}`;
      ctx.fillStyle = COLORS.textSecondary;
      ctx.textBaseline = "middle";
      const icon = FIELD_TYPE_ICONS[field.type] || "?";
      ctx.fillText(icon, x + 8, headerHeight / 2 - 1);

      // 字段名
      ctx.font = `500 13px ${FONT_FAMILY}`;
      ctx.fillStyle = COLORS.text;
      const nameMaxW = field.width - 40;
      const name = truncateText(ctx, field.name, nameMaxW);
      ctx.fillText(name, x + 28, headerHeight / 2);

      // 右侧下拉箭头 / 排序指示
      const hasFilter = filterConfigs.some(
        (fc: FilterConfig) => fc.fieldId === field.id,
      );
      const isSorted = sortConfig?.fieldId === field.id;
      if (isSorted) {
        ctx.font = `10px ${FONT_FAMILY}`;
        ctx.fillStyle = "#3B82F6";
        const arrow = sortConfig.direction === "asc" ? "▲" : "▼";
        ctx.fillText(arrow, x + field.width - 18, headerHeight / 2);
      } else if (hasFilter) {
        ctx.font = `10px ${FONT_FAMILY}`;
        ctx.fillStyle = "#3B82F6";
        ctx.fillText("◷", x + field.width - 18, headerHeight / 2);
        ctx.font = `10px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText("▾", x + field.width - 30, headerHeight / 2);
      } else {
        ctx.font = `10px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.textMuted;
        ctx.fillText("▾", x + field.width - 18, headerHeight / 2);
      }

      // 列分隔线
      ctx.strokeStyle = COLORS.headerBorder;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + field.width + 0.5, 0);
      ctx.lineTo(x + field.width + 0.5, headerHeight);
      ctx.stroke();
    }

    // 底部分隔线
    ctx.strokeStyle = COLORS.headerBorder;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, headerHeight - 0.5);
    ctx.lineTo(canvasWidth, headerHeight - 0.5);
    ctx.stroke();

    ctx.restore();
  }

  /** 绘制数据行 */
  drawRows(
    records: { id: string; values: Record<string, CellValue> }[],
    fields: FieldConfig[],
    range: {
      startRow: number;
      endRow: number;
      startCol: number;
      endCol: number;
    },
    scrollX: number,
    scrollY: number,
    canvasWidth: number,
    canvasHeight: number,
    rowHeight: number,
    headerHeight: number,
    rowNumberWidth: number,
    selectedCell: CellPosition | null,
    hoverCell: CellPosition | null,
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);

    // 裁剪到 body 区域
    ctx.beginPath();
    ctx.rect(0, headerHeight, canvasWidth, canvasHeight - headerHeight);
    ctx.clip();

    for (let rowIdx = range.startRow; rowIdx <= range.endRow; rowIdx++) {
      const record = records[rowIdx];
      if (!record) continue;
      const y = headerHeight + rowIdx * rowHeight - scrollY;

      // 行背景
      const isHoverRow = hoverCell?.recordId === record.id;
      const isSelectedRow = selectedCell?.recordId === record.id;
      if (isSelectedRow) {
        ctx.fillStyle = COLORS.rowHover;
      } else if (isHoverRow) {
        ctx.fillStyle = COLORS.rowHover;
      } else {
        ctx.fillStyle = rowIdx % 2 === 0 ? COLORS.rowBg : COLORS.rowBgAlt;
      }
      ctx.fillRect(0, y, canvasWidth, rowHeight);

      // 行号
      ctx.font = `12px ${FONT_FAMILY}`;
      ctx.fillStyle = COLORS.rowNumber;
      ctx.textBaseline = "middle";
      ctx.fillText(String(rowIdx + 1), 8, y + rowHeight / 2);

      // 行号列边线
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(rowNumberWidth + 0.5, y);
      ctx.lineTo(rowNumberWidth + 0.5, y + rowHeight);
      ctx.stroke();

      // 各字段单元格
      for (let colIdx = range.startCol; colIdx <= range.endCol; colIdx++) {
        const field = fields[colIdx];
        if (!field) continue;
        const x = this.getColX(fields, colIdx, rowNumberWidth) - scrollX;
        if (x + field.width < rowNumberWidth || x > canvasWidth) continue;

        const cellValue = record.values[field.id];
        const isSelected =
          selectedCell?.recordId === record.id &&
          selectedCell?.fieldId === field.id;
        const isHover =
          hoverCell?.recordId === record.id && hoverCell?.fieldId === field.id;

        // 单元格选中背景
        if (isSelected) {
          ctx.fillStyle = COLORS.cellSelected;
          ctx.fillRect(x, y, field.width, rowHeight);
        } else if (isHover) {
          ctx.fillStyle = "rgba(0,0,0,0.02)";
          ctx.fillRect(x, y, field.width, rowHeight);
        }

        // 绘制单元格内容
        this.drawCellContent(
          ctx,
          field,
          cellValue,
          x,
          y,
          field.width,
          rowHeight,
        );

        // 列分隔线
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x + field.width + 0.5, y);
        ctx.lineTo(x + field.width + 0.5, y + rowHeight);
        ctx.stroke();
      }

      // 行底部分隔线
      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, y + rowHeight - 0.5);
      ctx.lineTo(canvasWidth, y + rowHeight - 0.5);
      ctx.stroke();
    }

    // 选中单元格边框（在最上层绘制）
    if (selectedCell) {
      const recIdx = records.findIndex((r) => r.id === selectedCell.recordId);
      const fldIdx = fields.findIndex((f) => f.id === selectedCell.fieldId);
      if (recIdx >= 0 && fldIdx >= 0) {
        const sy = headerHeight + recIdx * rowHeight - scrollY;
        const sx = this.getColX(fields, fldIdx, rowNumberWidth) - scrollX;
        const sw = fields[fldIdx].width;
        ctx.strokeStyle = COLORS.cellSelectedBorder;
        ctx.lineWidth = 2;
        ctx.strokeRect(sx + 1, sy + 1, sw - 2, rowHeight - 2);
      }
    }

    ctx.restore();
  }

  /** 绘制单个单元格内容 */
  drawCellContent(
    ctx: CanvasRenderingContext2D,
    field: FieldConfig,
    value: CellValue,
    x: number,
    y: number,
    width: number,
    height: number,
  ) {
    const padding = 10;
    const maxTextWidth = width - padding * 2;
    ctx.textBaseline = "middle";
    const cy = y + height / 2;

    switch (field.type) {
      case "text":
      case "longText":
      case "email":
      case "phone": {
        const text = String(value || "");
        if (!text) break;
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        const truncated = truncateText(ctx, text, maxTextWidth);
        ctx.fillText(truncated, x + padding, cy);
        // longText: 显示小三角表示有更多内容
        if (field.type === "longText" && text.length > truncated.length) {
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = `10px ${FONT_FAMILY}`;
          ctx.fillText(
            "···",
            x + padding + getTextWidth(ctx, truncated) + 2,
            cy,
          );
        }
        // email: 带邮箱图标前缀
        if (field.type === "email" && text) {
          // 绘制小信封图标
          ctx.fillStyle = COLORS.textMuted;
          ctx.font = `10px ${FONT_FAMILY}`;
          const iconX = x + width - 18;
          ctx.fillText("✉", iconX, cy);
        }
        break;
      }

      case "url": {
        const text = String(value || "");
        if (!text) break;
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = "#1a73e8";
        const truncated = truncateText(ctx, text, maxTextWidth);
        ctx.fillText(truncated, x + padding, cy);
        break;
      }

      case "number": {
        const num = value as number | null;
        if (num === null || num === 0) break;
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        ctx.textAlign = "right";
        ctx.fillText(String(num), x + width - padding, cy);
        ctx.textAlign = "left";
        break;
      }

      case "select": {
        const options = value as SelectOption[] | null;
        if (!options || options.length === 0) break;
        const opt = options[0];
        ctx.font = `12px ${FONT_FAMILY}`;
        const textW = getTextWidth(ctx, opt.label);
        const tagW = textW + 16;
        const tagH = 22;
        const tagX = x + padding;
        const tagY = cy - tagH / 2;

        ctx.fillStyle = opt.color;
        ctx.beginPath();
        ctx.roundRect(tagX, tagY, tagW, tagH, 4);
        ctx.fill();

        ctx.fillStyle = COLORS.selectTagText;
        ctx.fillText(opt.label, tagX + 8, cy);
        break;
      }

      case "multiSelect": {
        const options = value as SelectOption[] | null;
        if (!options || options.length === 0) break;
        ctx.font = `12px ${FONT_FAMILY}`;
        let curX = x + padding;
        for (const opt of options) {
          const textW = getTextWidth(ctx, opt.label);
          const tagW = textW + 16;
          const tagH = 22;
          const tagY = cy - tagH / 2;
          const gap = 4;

          // 空间不够时显示 +N
          if (curX + tagW > x + width - padding) {
            const remain = options.length - options.indexOf(opt);
            ctx.fillStyle = COLORS.textMuted;
            ctx.font = `11px ${FONT_FAMILY}`;
            ctx.fillText(`+${remain}`, curX, cy);
            break;
          }

          ctx.fillStyle = opt.color;
          ctx.beginPath();
          ctx.roundRect(curX, tagY, tagW, tagH, 4);
          ctx.fill();

          ctx.fillStyle = COLORS.selectTagText;
          ctx.font = `12px ${FONT_FAMILY}`;
          ctx.fillText(opt.label, curX + 8, cy);
          curX += tagW + gap;
        }
        break;
      }

      case "date": {
        const dateStr = value as string;
        if (!dateStr) break;
        ctx.font = `13px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        const truncated = truncateText(ctx, dateStr, maxTextWidth);
        ctx.fillText(truncated, x + padding, cy);
        break;
      }

      case "checkbox": {
        const checked = value as boolean;
        const boxSize = 16;
        const boxX = x + (width - boxSize) / 2;
        const boxY = cy - boxSize / 2;

        ctx.strokeStyle = checked ? COLORS.checkbox : COLORS.textMuted;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxSize, boxSize, 3);
        ctx.stroke();

        if (checked) {
          ctx.fillStyle = COLORS.checkbox;
          ctx.beginPath();
          ctx.roundRect(boxX, boxY, boxSize, boxSize, 3);
          ctx.fill();

          ctx.strokeStyle = "#ffffff";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(boxX + 3.5, boxY + 8);
          ctx.lineTo(boxX + 6.5, boxY + 11);
          ctx.lineTo(boxX + 12.5, boxY + 5);
          ctx.stroke();
        }
        break;
      }

      case "progress": {
        const pct = Number(value ?? 0);
        const barH = 8;
        const barY = cy - barH / 2;
        const barX = x + padding;
        const barMaxW = width - padding * 2 - 32; // 留出百分比文字

        // 背景条
        ctx.fillStyle = "#E5E7EB";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barMaxW, barH, 4);
        ctx.fill();

        // 进度条
        if (pct > 0) {
          const fillColor = pct === 100 ? "#22C55E" : "#3B82F6";
          ctx.fillStyle = fillColor;
          ctx.beginPath();
          ctx.roundRect(barX, barY, barMaxW * (pct / 100), barH, 4);
          ctx.fill();
        }

        // 百分比文字
        ctx.font = `11px ${FONT_FAMILY}`;
        ctx.fillStyle = COLORS.text;
        ctx.fillText(`${pct}%`, x + width - padding - 24, cy);
        break;
      }

      case "rating": {
        const stars = Number(value ?? 0);
        const maxStars = 5;
        const starSize = 14;
        const gap = 2;
        const totalW = maxStars * (starSize + gap) - gap;
        const startX = x + (width - totalW) / 2;

        for (let i = 0; i < maxStars; i++) {
          const sx = startX + i * (starSize + gap);
          ctx.font = `${starSize}px ${FONT_FAMILY}`;
          ctx.fillStyle = i < stars ? "#F59E0B" : "#D1D5DB";
          ctx.fillText("★", sx, cy + starSize / 3);
        }
        break;
      }
    }
  }

  /** 命中检测 */
  hitTest(
    mouseX: number,
    mouseY: number,
    scrollX: number,
    scrollY: number,
    fields: FieldConfig[],
    records: { id: string }[],
    rowHeight: number,
    headerHeight: number,
    rowNumberWidth: number,
  ): { type: "header" | "cell"; fieldId?: string; recordId?: string } | null {
    // 表头区域
    if (mouseY < headerHeight && mouseY >= 0) {
      if (mouseX < rowNumberWidth) return { type: "header" };
      for (let i = 0; i < fields.length; i++) {
        const x = this.getColX(fields, i, rowNumberWidth) - scrollX;
        if (mouseX >= x && mouseX < x + fields[i].width) {
          return { type: "header", fieldId: fields[i].id };
        }
      }
      return { type: "header" };
    }

    // 数据行区域
    const bodyY = mouseY - headerHeight + scrollY;
    const rowIdx = Math.floor(bodyY / rowHeight);
    if (rowIdx < 0 || rowIdx >= records.length) return null;

    const recordId = records[rowIdx].id;
    if (mouseX < rowNumberWidth) {
      // 点击行号列
      return { type: "cell", recordId, fieldId: fields[0]?.id };
    }

    for (let i = 0; i < fields.length; i++) {
      const x = this.getColX(fields, i, rowNumberWidth) - scrollX;
      if (mouseX >= x && mouseX < x + fields[i].width) {
        return { type: "cell", fieldId: fields[i].id, recordId };
      }
    }

    return null;
  }
}

// ---- React 组件 ----

interface CanvasTableViewProps {
  documentId: string;
}

export default function CanvasTableView({ documentId }: CanvasTableViewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<TableRenderer | null>(null);

  const {
    fields,
    selectedCell,
    editingCell,
    hoverCell,
    scrollOffset,
    ROW_HEIGHT,
    HEADER_HEIGHT,
    ROW_NUMBER_WIDTH,
    sortConfig,
    filterConfigs,
    headerMenuFieldId,
    setScrollOffset,
    setSelectedCell,
    setEditingCell,
    setHoverCell,
    updateCell,
    setHeaderMenuFieldId,
    setSortConfig,
    addFilter,
    removeFilter,
    clearFilters,
  } = useTableStore();

  // 可见字段
  const visibleFields = useMemo(
    () => fields.filter((f) => f.visible),
    [fields],
  );

  // 排序/筛选后的记录
  const allRecords = useTableStore((s) => s.records);
  const records = useMemo(() => {
    const state = {
      records: allRecords,
      fields,
      sortConfig,
      filterConfigs,
    } as any;
    return selectSortedRecords(state);
  }, [allRecords, fields, sortConfig, filterConfigs]);

  // 总内容宽高
  const totalWidth = useMemo(
    () => ROW_NUMBER_WIDTH + visibleFields.reduce((sum, f) => sum + f.width, 0),
    [visibleFields, ROW_NUMBER_WIDTH],
  );
  const totalHeight = records.length * ROW_HEIGHT + HEADER_HEIGHT;

  // 获取单元格的屏幕坐标矩形（供浮层编辑器定位用）
  const getCellRect = useCallback(
    (recordId: string, fieldId: string) => {
      const recIdx = records.findIndex((r) => r.id === recordId);
      const fldIdx = visibleFields.findIndex((f) => f.id === fieldId);
      if (recIdx < 0 || fldIdx < 0) return null;

      let x = ROW_NUMBER_WIDTH;
      for (let i = 0; i < fldIdx; i++) {
        x += visibleFields[i].width;
      }

      return {
        x: x - scrollOffset.x,
        y: HEADER_HEIGHT + recIdx * ROW_HEIGHT - scrollOffset.y,
        width: visibleFields[fldIdx].width,
        height: ROW_HEIGHT,
      };
    },
    [
      records,
      visibleFields,
      scrollOffset,
      ROW_NUMBER_WIDTH,
      ROW_HEIGHT,
      HEADER_HEIGHT,
    ],
  );

  // 核心：重绘 Canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 尺寸同步
    if (
      canvas.width !== Math.floor(width * dpr) ||
      canvas.height !== Math.floor(height * dpr)
    ) {
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    }

    if (!rendererRef.current) {
      rendererRef.current = new TableRenderer(ctx, dpr);
    }
    const renderer = rendererRef.current;
    renderer.dpr = dpr;

    // 清空
    renderer.clear(width, height);

    // 可视范围
    const range = renderer.getVisibleRange(
      scrollOffset.x,
      scrollOffset.y,
      width,
      height,
      visibleFields,
      records,
      ROW_HEIGHT,
      HEADER_HEIGHT,
      ROW_NUMBER_WIDTH,
    );

    // 绘制行
    renderer.drawRows(
      records,
      visibleFields,
      range,
      scrollOffset.x,
      scrollOffset.y,
      width,
      height,
      ROW_HEIGHT,
      HEADER_HEIGHT,
      ROW_NUMBER_WIDTH,
      selectedCell,
      hoverCell,
    );

    // 绘制表头（覆盖在行之上）
    renderer.drawHeader(
      visibleFields,
      scrollOffset.x,
      width,
      HEADER_HEIGHT,
      ROW_NUMBER_WIDTH,
      hoverCell?.fieldId ?? null,
      sortConfig,
      filterConfigs,
    );
  }, [
    visibleFields,
    records,
    scrollOffset,
    selectedCell,
    hoverCell,
    ROW_HEIGHT,
    HEADER_HEIGHT,
    ROW_NUMBER_WIDTH,
    sortConfig,
    filterConfigs,
  ]);

  // 监听数据变化重绘
  useEffect(() => {
    rendererRef.current = null; // 重建 renderer
    requestAnimationFrame(redraw);
  }, [redraw]);

  // ResizeObserver
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      requestAnimationFrame(redraw);
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [redraw]);

  // 滚动事件
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const target = e.currentTarget;
      setScrollOffset({ x: target.scrollLeft, y: target.scrollTop });
    },
    [setScrollOffset],
  );

  // 鼠标事件
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container || !rendererRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const hit = rendererRef.current.hitTest(
        mouseX,
        mouseY,
        scrollOffset.x,
        scrollOffset.y,
        visibleFields,
        records,
        ROW_HEIGHT,
        HEADER_HEIGHT,
        ROW_NUMBER_WIDTH,
      );

      if (hit?.type === "cell") {
        setHoverCell(
          hit.fieldId && hit.recordId
            ? { fieldId: hit.fieldId, recordId: hit.recordId }
            : null,
        );
      } else {
        setHoverCell(null);
      }
    },
    [
      scrollOffset,
      visibleFields,
      records,
      ROW_HEIGHT,
      HEADER_HEIGHT,
      ROW_NUMBER_WIDTH,
      setHoverCell,
    ],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      // 忽略双击时触发的第二次 click
      if (e.detail === 2) return;

      const canvas = canvasRef.current;
      if (!canvas || !rendererRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const hit = rendererRef.current.hitTest(
        mouseX,
        mouseY,
        scrollOffset.x,
        scrollOffset.y,
        visibleFields,
        records,
        ROW_HEIGHT,
        HEADER_HEIGHT,
        ROW_NUMBER_WIDTH,
      );

      if (hit?.type === "cell" && hit.fieldId && hit.recordId) {
        setSelectedCell({ fieldId: hit.fieldId, recordId: hit.recordId });
        setEditingCell(null);

        // checkbox 直接切换
        const field = visibleFields.find((f) => f.id === hit.fieldId);
        if (field?.type === "checkbox") {
          const record = records.find((r) => r.id === hit.recordId);
          if (record) {
            updateCell(hit.recordId, hit.fieldId, !record.values[hit.fieldId]);
          }
        }
      } else if (hit?.type === "header" && hit.fieldId) {
        // 点击表头 -> 打开字段菜单
        setHeaderMenuFieldId(hit.fieldId);
        setSelectedCell(null);
        setEditingCell(null);
      } else {
        setSelectedCell(null);
        setEditingCell(null);
        setHeaderMenuFieldId(null);
      }
    },
    [
      scrollOffset,
      visibleFields,
      records,
      ROW_HEIGHT,
      HEADER_HEIGHT,
      ROW_NUMBER_WIDTH,
      setSelectedCell,
      setEditingCell,
      updateCell,
      setHeaderMenuFieldId,
    ],
  );

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas || !rendererRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const hit = rendererRef.current.hitTest(
        mouseX,
        mouseY,
        scrollOffset.x,
        scrollOffset.y,
        visibleFields,
        records,
        ROW_HEIGHT,
        HEADER_HEIGHT,
        ROW_NUMBER_WIDTH,
      );

      if (hit?.type === "cell" && hit.fieldId && hit.recordId) {
        const field = visibleFields.find((f) => f.id === hit.fieldId);
        if (field?.type === "checkbox") return; // checkbox 不需要编辑器
        setEditingCell({ fieldId: hit.fieldId, recordId: hit.recordId });
      }
    },
    [
      scrollOffset,
      visibleFields,
      records,
      ROW_HEIGHT,
      HEADER_HEIGHT,
      ROW_NUMBER_WIDTH,
      setEditingCell,
    ],
  );

  const handleMouseLeave = useCallback(() => {
    setHoverCell(null);
  }, [setHoverCell]);

  // 键盘导航
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (!selectedCell) return;

      const recIdx = records.findIndex((r) => r.id === selectedCell.recordId);
      const fldIdx = visibleFields.findIndex(
        (f) => f.id === selectedCell.fieldId,
      );
      if (recIdx < 0 || fldIdx < 0) return;

      let newRecIdx = recIdx;
      let newFldIdx = fldIdx;

      switch (e.key) {
        case "ArrowUp":
          newRecIdx = Math.max(0, recIdx - 1);
          break;
        case "ArrowDown":
          newRecIdx = Math.min(records.length - 1, recIdx + 1);
          break;
        case "ArrowLeft":
          newFldIdx = Math.max(0, fldIdx - 1);
          break;
        case "ArrowRight":
          newFldIdx = Math.min(visibleFields.length - 1, fldIdx + 1);
          break;
        case "Tab":
          e.preventDefault();
          if (e.shiftKey) {
            newFldIdx = Math.max(0, fldIdx - 1);
          } else {
            newFldIdx = Math.min(visibleFields.length - 1, fldIdx + 1);
          }
          break;
        case "Enter":
          e.preventDefault();
          if (editingCell) {
            setEditingCell(null);
          } else {
            const field = visibleFields[fldIdx];
            if (field?.type !== "checkbox") {
              setEditingCell({ ...selectedCell });
            }
          }
          return;
        case "Escape":
          setEditingCell(null);
          setSelectedCell(null);
          return;
        default:
          return;
      }

      e.preventDefault();
      const newRecord = records[newRecIdx];
      const newField = visibleFields[newFldIdx];
      if (newRecord && newField) {
        setSelectedCell({ recordId: newRecord.id, fieldId: newField.id });
        setEditingCell(null);
      }
    },
    [
      selectedCell,
      editingCell,
      records,
      visibleFields,
      setSelectedCell,
      setEditingCell,
    ],
  );

  // documentId 保留供后续 Yjs 集成使用
  void documentId;

  return (
    <div className="flex flex-col w-full h-full">
      {/* 工具栏 */}
      <TableToolbar documentId={documentId} />

      {/* Canvas 区域 */}
      <div
        ref={containerRef}
        className="relative flex-1 min-h-0 overflow-hidden"
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        {/* Canvas 固定在可视区域，不随滚动移动 */}
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 z-10 pointer-events-none"
          style={{ width: "100%", height: "100%" }}
        />

        {/* 滚动容器（透明，仅用于撑出滚动条和触发 scroll 事件） */}
        <div
          className="absolute inset-0 overflow-auto z-20"
          onScroll={handleScroll}
          onMouseMove={handleMouseMove}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onMouseLeave={handleMouseLeave}
        >
          <div
            style={{
              width: totalWidth,
              height: totalHeight,
            }}
          />
        </div>

        {/* 浮层编辑器 */}
        {editingCell && (
          <CellEditorOverlay
            fieldId={editingCell.fieldId}
            recordId={editingCell.recordId}
            getCellRect={getCellRect}
          />
        )}

        {/* 表头字段菜单 */}
        {headerMenuFieldId && (
          <HeaderMenu
            fieldId={headerMenuFieldId}
            onClose={() => setHeaderMenuFieldId(null)}
          />
        )}
      </div>

      {/* 底部状态栏 */}
      <div className="px-4 py-1.5 border-t border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 text-xs text-gray-400 text-center">
        多维表格 · Canvas 渲染 · 双击编辑单元格
      </div>
    </div>
  );
}

// ---- 完整浮层编辑器 ----

function CellEditorOverlay({
  fieldId,
  recordId,
  getCellRect,
}: {
  fieldId: string;
  recordId: string;
  getCellRect: (
    recordId: string,
    fieldId: string,
  ) => { x: number; y: number; width: number; height: number } | null;
}) {
  const { fields, records, updateCell, setEditingCell } = useTableStore();
  const field = fields.find((f) => f.id === fieldId);
  const record = records.find((r) => r.id === recordId);
  const rect = getCellRect(recordId, fieldId);

  if (!rect || !field) return null;

  // checkbox 直接切换，不需要编辑器
  if (field.type === "checkbox") return null;

  const handleClose = () => setEditingCell(null);

  const editorProps = {
    field,
    recordId,
    value: record?.values[fieldId],
    updateCell,
    onClose: handleClose,
    rect,
  };

  return (
    <div className="absolute z-50" style={{ left: rect.x, top: rect.y }}>
      {field.type === "select" || field.type === "multiSelect" ? (
        <SelectEditor {...editorProps} />
      ) : field.type === "date" ? (
        <DateEditor {...editorProps} />
      ) : field.type === "progress" ? (
        <ProgressEditor {...editorProps} />
      ) : field.type === "rating" ? (
        <RatingEditor {...editorProps} />
      ) : (
        <TextEditor {...editorProps} />
      )}
    </div>
  );
}

// --- 通用编辑器 Props ---
interface EditorProps {
  field: FieldConfig;
  recordId: string;
  value: CellValue | undefined;
  updateCell: (recordId: string, fieldId: string, value: CellValue) => void;
  onClose: () => void;
  rect: { x: number; y: number; width: number; height: number };
}

// --- 文本编辑器 (text / longText / number / url / email / phone) ---
function TextEditor({
  field,
  recordId,
  value,
  updateCell,
  onClose,
  rect,
}: EditorProps) {
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const isLong = field.type === "longText";

  const displayValue =
    field.type === "select" || field.type === "multiSelect"
      ? ""
      : String(value ?? "");

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
      if ("select" in inputRef.current) inputRef.current.select();
    }
  }, []);

  const commitValue = (v: string) => {
    if (field.type === "number") {
      updateCell(recordId, field.id, Number(v) || 0);
    } else if (field.type === "progress") {
      updateCell(
        recordId,
        field.id,
        Math.min(100, Math.max(0, Number(v) || 0)),
      );
    } else {
      updateCell(recordId, field.id, v);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLong) {
      e.preventDefault();
      onClose();
    } else if (e.key === "Escape") {
      onClose();
    } else if (e.key === "Tab") {
      e.preventDefault();
      onClose();
    }
  };

  if (isLong) {
    return (
      <div
        style={{ width: Math.max(rect.width, 240), minHeight: 120 }}
        className="bg-white border-2 border-blue-500 rounded shadow-lg p-1"
      >
        <textarea
          ref={inputRef as React.RefObject<HTMLTextAreaElement>}
          defaultValue={displayValue}
          onChange={(e) => commitValue(e.target.value)}
          onBlur={onClose}
          onKeyDown={handleKeyDown}
          className="w-full h-[100px] px-2 py-1 text-[13px] outline-none resize-none"
          placeholder="输入多行文本..."
        />
      </div>
    );
  }

  return (
    <div style={{ width: rect.width, height: rect.height }}>
      <input
        ref={inputRef as React.RefObject<HTMLInputElement>}
        defaultValue={displayValue}
        onChange={(e) => commitValue(e.target.value)}
        onBlur={onClose}
        onKeyDown={handleKeyDown}
        className="w-full h-full px-2.5 text-[13px] border-2 border-blue-500 outline-none bg-white"
        placeholder={
          field.type === "email"
            ? "email@example.com"
            : field.type === "phone"
              ? "13800138000"
              : field.type === "url"
                ? "https://"
                : undefined
        }
      />
    </div>
  );
}

// --- 单选/多选下拉编辑器 ---
function SelectEditor({
  field,
  recordId,
  value,
  updateCell,
  onClose,
  rect,
}: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isMulti = field.type === "multiSelect";
  const options = field.options || [];
  const selected = (value as SelectOption[]) || [];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const toggleOption = (opt: SelectOption) => {
    if (isMulti) {
      const exists = selected.find((s) => s.id === opt.id);
      const next = exists
        ? selected.filter((s) => s.id !== opt.id)
        : [...selected, opt];
      updateCell(recordId, field.id, next);
    } else {
      updateCell(recordId, field.id, [opt]);
      onClose();
    }
  };

  return (
    <div
      ref={ref}
      style={{ width: Math.max(rect.width, 200) }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl py-1 max-h-[280px] overflow-y-auto"
    >
      {/* 已选标签（多选） */}
      {isMulti && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 px-2 py-1.5 border-b border-gray-100">
          {selected.map((s) => (
            <span
              key={s.id}
              className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium cursor-pointer hover:opacity-80"
              style={{ backgroundColor: s.color }}
              onClick={() => toggleOption(s)}
            >
              {s.label}
              <svg className="w-3 h-3" viewBox="0 0 12 12" fill="currentColor">
                <path
                  d="M9 3L3 9M3 3l6 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </span>
          ))}
        </div>
      )}
      {/* 选项列表 */}
      {options.map((opt) => {
        const isSelected = selected.some((s) => s.id === opt.id);
        return (
          <div
            key={opt.id}
            className={`flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-gray-50 ${isSelected ? "bg-blue-50" : ""}`}
            onClick={() => toggleOption(opt)}
          >
            <span
              className="inline-block w-3 h-3 rounded-sm"
              style={{ backgroundColor: opt.color }}
            />
            <span className="text-[13px]">{opt.label}</span>
            {isSelected && (
              <svg
                className="w-4 h-4 ml-auto text-blue-500"
                viewBox="0 0 16 16"
                fill="currentColor"
              >
                <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z" />
              </svg>
            )}
          </div>
        );
      })}
      {options.length === 0 && (
        <div className="px-3 py-2 text-xs text-gray-400 text-center">
          暂无选项，请在字段配置中添加
        </div>
      )}
    </div>
  );
}

// --- 日期编辑器 ---
function DateEditor({
  field,
  recordId,
  value,
  updateCell,
  onClose,
  rect,
}: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [dateVal, setDateVal] = useState(String(value ?? ""));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  const commit = (v: string) => {
    setDateVal(v);
    updateCell(recordId, field.id, v);
  };

  return (
    <div
      ref={ref}
      style={{ width: Math.max(rect.width, 220) }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl p-2"
    >
      <input
        type="date"
        value={dateVal}
        onChange={(e) => commit(e.target.value)}
        className="w-full px-2 py-1.5 text-[13px] border border-gray-200 rounded outline-none focus:border-blue-500"
      />
      <div className="flex gap-1 mt-1.5">
        <button
          className="flex-1 text-xs py-1 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => commit(new Date().toISOString().split("T")[0])}
        >
          今天
        </button>
        <button
          className="flex-1 text-xs py-1 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => {
            const d = new Date();
            d.setDate(d.getDate() + 1);
            commit(d.toISOString().split("T")[0]);
          }}
        >
          明天
        </button>
        <button
          className="flex-1 text-xs py-1 rounded bg-gray-100 hover:bg-gray-200"
          onClick={() => commit("")}
        >
          清除
        </button>
      </div>
    </div>
  );
}

// --- 进度条编辑器 ---
function ProgressEditor({
  field,
  recordId,
  value,
  updateCell,
  onClose,
  rect,
}: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [val, setVal] = useState(Number(value ?? 0));

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ width: Math.max(rect.width, 180) }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl p-3"
    >
      <div className="flex items-center gap-2 mb-2">
        <input
          type="range"
          min={0}
          max={100}
          value={val}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVal(v);
            updateCell(recordId, field.id, v);
          }}
          className="flex-1 accent-blue-500"
        />
        <span className="text-sm font-medium w-10 text-right">{val}%</span>
      </div>
      <div className="flex gap-1">
        {[0, 25, 50, 75, 100].map((p) => (
          <button
            key={p}
            className={`flex-1 text-xs py-1 rounded ${val === p ? "bg-blue-100 text-blue-700" : "bg-gray-100 hover:bg-gray-200"}`}
            onClick={() => {
              setVal(p);
              updateCell(recordId, field.id, p);
            }}
          >
            {p}%
          </button>
        ))}
      </div>
    </div>
  );
}

// --- 星级编辑器 ---
function RatingEditor({
  field,
  recordId,
  value,
  updateCell,
  onClose,
  rect,
}: EditorProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [val, setVal] = useState(Number(value ?? 0));
  const maxStars = 5;

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      style={{ width: Math.max(rect.width, 180) }}
      className="bg-white border border-gray-200 rounded-lg shadow-xl p-3 flex items-center gap-1"
    >
      {Array.from({ length: maxStars }, (_, i) => (
        <button
          key={i}
          className="text-xl leading-none hover:scale-125 transition-transform"
          onClick={() => {
            const next = val === i + 1 ? 0 : i + 1;
            setVal(next);
            updateCell(recordId, field.id, next);
          }}
        >
          {i < val ? "★" : "☆"}
        </button>
      ))}
      <span className="ml-2 text-sm text-gray-500">
        {val}/{maxStars}
      </span>
    </div>
  );
}

// --- 表头字段菜单 ---
function HeaderMenu({
  fieldId,
  onClose,
}: {
  fieldId: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const {
    fields,
    sortConfig,
    filterConfigs,
    setSortConfig,
    addFilter,
    removeFilter,
    updateField,
    deleteField,
  } = useTableStore();
  const field = fields.find((f) => f.id === fieldId);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (!field) return null;

  const currentSort = sortConfig?.fieldId === fieldId ? sortConfig : null;
  const currentFilter = filterConfigs.find((f) => f.fieldId === fieldId);

  return (
    <div
      ref={ref}
      className="absolute z-50 top-8 left-12 w-56 bg-white border border-gray-200 rounded-lg shadow-xl"
    >
      <div className="p-2 space-y-1">
        {/* 字段名 */}
        <div className="px-2 py-1.5 font-medium text-sm border-b border-gray-100 mb-1">
          {FIELD_TYPE_ICONS[field.type]} {field.name}
        </div>

        {/* 排序 */}
        <div className="text-[11px] text-gray-400 px-2 pt-1">排序</div>
        <button
          className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2 ${currentSort?.direction === "asc" ? "text-blue-600 font-medium" : ""}`}
          onClick={() => {
            setSortConfig({ fieldId, direction: "asc" });
            onClose();
          }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 2l4 6H4z" />
          </svg>
          升序排列
        </button>
        <button
          className={`w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2 ${currentSort?.direction === "desc" ? "text-blue-600 font-medium" : ""}`}
          onClick={() => {
            setSortConfig({ fieldId, direction: "desc" });
            onClose();
          }}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 14l4-6H4z" />
          </svg>
          降序排列
        </button>
        {currentSort && (
          <button
            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 text-gray-500"
            onClick={() => {
              setSortConfig(null);
              onClose();
            }}
          >
            清除排序
          </button>
        )}

        {/* 筛选 */}
        <div className="text-[11px] text-gray-400 px-2 pt-2 border-t border-gray-100">
          筛选
        </div>
        {currentFilter ? (
          <div className="px-2 py-1 space-y-1">
            <div className="flex gap-1">
              <select
                value={currentFilter.type}
                onChange={(e) => {
                  addFilter({
                    fieldId,
                    type: e.target.value as any,
                    value: "",
                  });
                  removeFilter(fieldId);
                }}
                className="flex-1 text-xs border border-gray-200 rounded px-1 py-0.5"
              >
                <option value="contains">包含</option>
                <option value="equals">等于</option>
                <option value="notEmpty">不为空</option>
                <option value="empty">为空</option>
              </select>
            </div>
            {currentFilter.type !== "empty" &&
              currentFilter.type !== "notEmpty" && (
                <input
                  value={currentFilter.value}
                  onChange={(e) => {
                    removeFilter(fieldId);
                    addFilter({
                      fieldId,
                      type: currentFilter.type,
                      value: e.target.value,
                    });
                  }}
                  placeholder="输入筛选值..."
                  className="w-full text-xs border border-gray-200 rounded px-2 py-0.5"
                />
              )}
            <button
              className="text-xs text-red-500 hover:underline"
              onClick={() => {
                removeFilter(fieldId);
                onClose();
              }}
            >
              清除筛选
            </button>
          </div>
        ) : (
          <button
            className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2"
            onClick={() => {
              addFilter({ fieldId, type: "contains", value: "" });
            }}
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M2 4h12M5 8h6M7 12h2" />
            </svg>
            添加筛选
          </button>
        )}

        {/* 操作 */}
        <div className="text-[11px] text-gray-400 px-2 pt-2 border-t border-gray-100">
          操作
        </div>
        <button
          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-gray-50 flex items-center gap-2"
          onClick={() => {
            updateField(fieldId, { visible: false });
            onClose();
          }}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M2 8h12M8 2v12" />
          </svg>
          隐藏此列
        </button>
        <button
          className="w-full text-left px-2 py-1.5 text-xs rounded hover:bg-red-50 text-red-500 flex items-center gap-2"
          onClick={() => {
            deleteField(fieldId);
            onClose();
          }}
        >
          <svg
            className="w-3.5 h-3.5"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M3 4h10M6 4V2h4v2M5 4v9h6V4" />
          </svg>
          删除此列
        </button>
      </div>
    </div>
  );
}
