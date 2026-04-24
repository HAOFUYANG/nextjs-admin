"use client";
import { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TableCaption,
} from "@/components/ui/table";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import * as React from "react";

type ConfigRow = {
  id: string;
  name: string;
  version: string;
  appId: string;
  createTime: string;
};

export default function AppConfigsOverview() {
  const params = useParams<{ appId: string }>();
  const router = useRouter();
  const appId = params.appId;

  const [keyword, setKeyword] = useState("");
  const [version, setVersion] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [list, setList] = useState<ConfigRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const allSelected = list.length > 0 && list.every((i) => selected[i.id]);
  const [stats, setStats] = useState<{
    total: number;
    lastUpdated: string | null;
    versions: string[];
  }>({
    total: 0,
    lastUpdated: null,
    versions: [],
  });

  const statsText = useMemo(() => {
    const last = stats.lastUpdated
      ? new Date(stats.lastUpdated).toLocaleString("zh-CN")
      : "-";
    const versions = stats.versions.join(", ");
    return { last, versions };
  }, [stats]);

  const fetchList = useCallback(
    async (opts?: {
      keyword?: string;
      version?: string;
      page?: number;
    }) => {
      setLoading(true);
      try {
        const res = await fetch(`/api/apps/${appId}/configs`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            page: opts?.page ?? page,
            pageSize,
            keyword: opts?.keyword ?? keyword,
            version: opts?.version ?? version,
          }),
        });
        const data = await res.json();
        if (!res.ok || data?.errno !== 0)
          throw new Error(data?.message || "查询失败");
        setList(data?.data ?? []);
        setStats({
          total: data?.stats?.total ?? 0,
          lastUpdated: data?.stats?.lastUpdated ?? null,
          versions: data?.stats?.versions ?? [],
        });
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "网络错误，请稍后重试");
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appId, page, pageSize]
  );

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const handleSearch = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    await fetchList({ keyword, version, page: 1 });
  };

  const handleReset = async () => {
    setKeyword("");
    setVersion("");
    setPage(1);
    await fetchList({ keyword: "", version: "", page: 1 });
  };

  const toCreate = () => router.push("/config/new");
  const toEdit = (id: string) => router.push(`/config/new?id=${id}&isEdit=true`);
  const toDetail = (id: string) => router.push(`/config/new?id=${id}&isEdit=false`);
  const toggleAll = (checked: boolean) => {
    const next: Record<string, boolean> = {};
    if (checked) list.forEach((i) => (next[i.id] = true));
    setSelected(next);
  };
  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => ({ ...prev, [id]: checked }));
  };
  const batchDelete = async () => {
    const ids = list.filter((i) => selected[i.id]).map((i) => i.id);
    if (ids.length === 0) {
      toast.error("请先勾选要删除的配置");
      return;
    }
    setLoading(true);
    try {
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/config/${id}`, { method: "DELETE" }).then((r) => r.json()),
        ),
      );
      toast.success("删除成功");
      await fetchList();
      setSelected({});
    } catch {
      toast.error("删除失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  };
  const batchExport = async () => {
    const ids = list.filter((i) => selected[i.id]).map((i) => i.id);
    try {
      const res = await fetch(`/api/apps/${appId}/configs/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, keyword, version }),
      });
      if (!res.ok) throw new Error("导出失败");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `app-${appId}-configs.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "导出失败");
    }
  };

  return (
    <div className="mx-auto max-w-7xl">
      <PageBreadcrumb
        pageTitle={`应用 ${appId} 配置总览`}
        parentTitle="配置列表"
        parentHref="/config"
      />
      <div className="space-y-6">
        <form onSubmit={handleSearch}>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
            <FieldGroup>
              <FieldSet>
                <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="keyword">名称</FieldLabel>
                    <Input
                      id="keyword"
                      placeholder="名称模糊匹配"
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="version">版本</FieldLabel>
                    <Input
                      id="version"
                      placeholder="精确版本"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                    />
                  </Field>
                </FieldGroup>
              </FieldSet>
            </FieldGroup>
            <div className="mt-6 flex items-center gap-3">
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? "查询中..." : "查询"}
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

        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500 dark:text-gray-400">
            <span className="mr-4">配置数量：{stats.total}</span>
            <span className="mr-4">最近更新：{statsText.last}</span>
            <span>版本分布：{statsText.versions || "-"}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={batchDelete} disabled={loading}>
              批量删除
            </Button>
            <Button variant="outline" size="sm" onClick={batchExport} disabled={loading}>
              导出 CSV
            </Button>
            <Button size="sm" onClick={toCreate}>新建配置</Button>
          </div>
        </div>

        <div className="max-w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      toggleAll(e.target.checked)
                    }
                  />
                </TableHead>
                <TableHead>名称</TableHead>
                <TableHead>版本</TableHead>
                <TableHead>创建时间</TableHead>
                <TableHead className="text-right">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-20 text-center">
                    <Spinner className="h-5 w-5 mx-auto text-primary" />
                  </TableCell>
                </TableRow>
              ) : list.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-sm text-gray-500">
                    暂无数据
                  </TableCell>
                </TableRow>
              ) : (
                list.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={!!selected[i.id]}
                        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                          toggleOne(i.id, e.target.checked)
                        }
                      />
                    </TableCell>
                    <TableCell className="font-medium">{i.name}</TableCell>
                    <TableCell>{i.version}</TableCell>
                    <TableCell>
                      {i.createTime
                        ? new Date(i.createTime).toLocaleString("zh-CN")
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center gap-2 justify-end">
                        <Button size="sm" onClick={() => toEdit(i.id)}>
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => toDetail(i.id)}
                        >
                          详情
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
