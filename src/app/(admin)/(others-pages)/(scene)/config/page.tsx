"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { Table as DbTable } from "@/lib/schema";

// 项目 UI 组件
import Button from "@/components/ui/button/Button";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import { Modal } from "@/components/ui/modal";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import Pagination from "@/components/tables/Pagination";

type TableListItem = DbTable & {
  appName?: string | null;
};

const formatCNDateTime = (value: unknown) => {
  if (!value) return "-";
  const d =
    value instanceof Date
      ? value
      : typeof value === "string" || typeof value === "number"
        ? new Date(value)
        : null;
  if (!d || Number.isNaN(d.getTime())) return "-";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
};

const Config: React.FC = () => {
  const router = useRouter();

  const [name, setName] = useState("");
  const [appId, setAppId] = useState("");
  const [version, setVersion] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;
  const [list, setList] = useState<TableListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 删除确认弹窗状态
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deletingRow, setDeletingRow] = useState<TableListItem | null>(null);

  const fetchList = useCallback(
    async (params?: {
      name?: string;
      appId?: string;
      version?: string;
      page?: number;
      pageSize?: number;
    }) => {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`/api/config/list`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ page, pageSize, ...params }),
        });
        const json = await res.json();
        if (json?.errno === 0) {
          setList(json.data ?? []);
        } else {
          setError(json?.message || "查询失败");
        }
      } catch {
        setError("网络错误，请稍后重试");
      } finally {
        setLoading(false);
      }
    },
    [page, pageSize]
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleUpdate = (row: TableListItem) => {
    if (!row?.id) return;
    router.push(`/table/new?id=${row.id}&isEdit=true`);
  };

  const handleDetail = (row: TableListItem) => {
    if (!row?.id) return;
    router.push(`/table/new?id=${row.id}&isEdit=false`);
  };

  const openDeleteModal = (row: TableListItem) => {
    setDeletingRow(row);
    setIsDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!deletingRow?.id) return;
    try {
      const res = await fetch(`/api/config/${deletingRow.id}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json?.errno === 0) {
        fetchList();
      } else {
        setError(json?.message || "删除失败");
      }
    } catch {
      setError("网络错误，请稍后重试");
    } finally {
      setIsDeleteModalOpen(false);
      setDeletingRow(null);
    }
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchList({ name, appId, version, page: 1, pageSize });
  };

  const handleReset = () => {
    setName("");
    setAppId("");
    setVersion("");
    setPage(1);
    fetchList({ page: 1, pageSize, name: "", appId: "", version: "" });
  };

  const appLinks = useMemo(() => {
    return list.map((item) => {
      const ids = String(item.appId)
        .split(/[,\s]+/)
        .filter(Boolean);
      const label =
        item.appName && ids.length === 1 ? `${item.appName} (${ids[0]})` : null;
      return { id: item.id, ids, label };
    });
  }, [list]);

  return (
    <div className="mx-auto max-w-7xl">
      <PageBreadcrumb pageTitle="配置列表" />
      <div className="space-y-6">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <div>
              <Label htmlFor="name">名称</Label>
              <Input
                id="name"
                placeholder="请输入"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="version">版本</Label>
              <Input
                id="version"
                placeholder="请输入"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="appId">应用 ID</Label>
              <Input
                id="appId"
                placeholder="请输入"
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
              />
            </div>
            <div className="  mt-6">
              <div className="flex justify-start gap-3">
                <Button type="submit">
                  查询
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleReset}
                  disabled={loading}
                >
                  重置
                </Button></div>

            </div>
          </div>


        </form>

        <div className="flex justify-end mb-4">
          <Button onClick={() => router.push("/config/new")}>新建配置</Button>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-red-500 bg-red-50 rounded-lg dark:bg-red-900/20 dark:text-red-400">
            {error}
          </div>
        )}

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader className="border-gray-100 dark:border-gray-800 border-y">
              <TableRow>
                <TableCell
                  isHeader
                  className="py-3 px-5 text-start text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  名称
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-5 text-start text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  版本
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-5 text-start text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  涉及应用
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-5 text-start text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  创建时间
                </TableCell>
                <TableCell
                  isHeader
                  className="py-3 px-5 text-end text-sm font-medium text-gray-500 dark:text-gray-400"
                >
                  操作
                </TableCell>
              </TableRow>
            </TableHeader>
            <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
              {list.map((item) => {
                const meta = appLinks.find((x) => x.id === item.id);
                return (
                  <TableRow key={item.id ?? item.name}>
                    <TableCell className="py-4 px-5 text-sm text-gray-800 dark:text-white/90">
                      {item.name}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500 dark:text-gray-400">
                      {item.version}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex flex-wrap gap-2">
                        {meta?.ids.map((id) => (
                          <NextLink
                            key={id}
                            href={`/apps/${id}`}
                            className="text-brand-500 hover:underline"
                          >
                            {meta.label && meta.ids.length === 1
                              ? meta.label
                              : id}
                          </NextLink>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="py-4 px-5 text-sm text-gray-500 dark:text-gray-400">
                      {formatCNDateTime(item.createTime)}
                    </TableCell>
                    <TableCell className="py-4 px-5 text-end">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          onClick={() => handleUpdate(item)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDetail(item)}
                        >
                          详情
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                          onClick={() => openDeleteModal(item)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {loading ? "加载中..." : `共 ${list.length} 条数据`}
          </div>
          <Pagination
            currentPage={page}
            totalPages={list.length >= pageSize ? page + 1 : page}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* 删除确认 Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        className="max-w-[400px] p-6"
      >
        <div className="text-center">
          <h4 className="text-lg font-semibold text-gray-800 dark:text-white/90 mb-2">
            确定删除吗？
          </h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            删除后无法恢复，请确认是否继续删除配置：
            <span className="font-medium text-gray-800 dark:text-white/90">
              {deletingRow?.name}
            </span>
          </p>
          <div className="flex justify-center gap-3">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              取消
            </Button>
            <Button
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={handleDelete}
            >
              确定删除
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default Config;
