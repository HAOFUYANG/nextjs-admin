"use client";
import React, { useEffect, useMemo, useState, useCallback } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { Table as DbTable } from "@/lib/schema";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableHeader,
  TableBody,
  TableHead,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import { Modal } from "@/components/ui/modal";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import {
  Pagination as PaginationNav,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";

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
    router.push(`/config/new?id=${row.id}&isEdit=true`);
  };

  const handleDetail = (row: TableListItem) => {
    if (!row?.id) return;
    router.push(`/config/new?id=${row.id}&isEdit=false`);
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
        toast.success("删除成功");
        fetchList();
      }
    } catch {
      toast.error("删除失败");
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
            <FieldGroup>
              <FieldSet>
                <FieldGroup className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Field>
                    <FieldLabel htmlFor="name">名称</FieldLabel>
                    <Input
                      id="name"
                      placeholder="请输入"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="version">版本</FieldLabel>
                    <Input
                      id="version"
                      placeholder="请输入"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="appId">应用 ID</FieldLabel>
                    <Input
                      id="appId"
                      placeholder="请输入"
                      value={appId}
                      onChange={(e) => setAppId(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
            <div className="flex items-center gap-3">
              <Button type="submit" size="sm" disabled={loading}>
                查询
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={loading}
              >
                重置
              </Button>
            </div>
          </div>


        </form>

        <div className="flex justify-end mb-4">
          <Button size="sm" onClick={() => router.push("/config/new")}>新建配置</Button>
        </div>

        {error && (
          <div className="p-4 mb-4 text-sm text-destructive bg-destructive/10 rounded-lg">
            {error}
          </div>
        )}

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>涉及应用</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell className="py-20 text-center" colSpan={5}>
                    <Spinner className="h-5 w-5 mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : (list.map((item) => {
                const meta = appLinks.find((x) => x.id === item.id);
                return (
                  <TableRow key={item.id ?? item.name}>
                    <TableCell className="font-medium">
                      {item.name}
                    </TableCell>
                    <TableCell>
                      {item.version}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-2">
                        {meta?.ids.map((id) => (
                          <NextLink
                            key={id}
                            href={`/config/apps/${id}`}
                            className="text-primary hover:underline"
                          >
                            {meta.label && meta.ids.length === 1
                              ? meta.label
                              : id}
                          </NextLink>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      {formatCNDateTime(item.createTime)}
                    </TableCell>
                    <TableCell className="text-right">
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
                          variant="destructive"
                          onClick={() => openDeleteModal(item)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              }))}

            </TableBody>
          </Table>
        </div>

        <div className="flex justify-between items-center mt-6">
          <div className="text-sm text-muted-foreground">
            {`共 ${list.length} 条数据`}
          </div>
          <PaginationNav>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  href="#"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    if (page > 1) handlePageChange(page - 1);
                  }}
                  aria-disabled={page <= 1}
                  className={page <= 1 ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
              {page > 3 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              {Array.from(
                { length: Math.min(3, list.length >= pageSize ? page + 1 : page) },
                (_, i) => i + Math.max(page - 1, 1),
              ).map((p) => (
                <PaginationItem key={p}>
                  <PaginationLink
                    href="#"
                    onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                      e.preventDefault();
                      handlePageChange(p);
                    }}
                    isActive={page === p}
                  >
                    {p}
                  </PaginationLink>
                </PaginationItem>
              ))}
              {page < (list.length >= pageSize ? page + 1 : page) - 2 && (
                <PaginationItem>
                  <PaginationEllipsis />
                </PaginationItem>
              )}
              <PaginationItem>
                <PaginationNext
                  href="#"
                  onClick={(e: React.MouseEvent<HTMLAnchorElement>) => {
                    e.preventDefault();
                    const totalPages = list.length >= pageSize ? page + 1 : page;
                    if (page < totalPages) handlePageChange(page + 1);
                  }}
                  aria-disabled={page >= (list.length >= pageSize ? page + 1 : page)}
                  className={page >= (list.length >= pageSize ? page + 1 : page) ? "pointer-events-none opacity-50" : ""}
                />
              </PaginationItem>
            </PaginationContent>
          </PaginationNav>
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
            <Button variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
              取消
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
            >
              确定删除
            </Button>
          </div>
        </div>
      </Modal>
    </div >
  );
};

export default Config;
