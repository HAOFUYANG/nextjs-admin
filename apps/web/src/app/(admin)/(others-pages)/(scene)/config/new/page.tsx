"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Trash } from "lucide-react";
import { toast } from "sonner";
import type { AppInfo } from "@/lib/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";
import { Spinner } from "@/components/ui/spinner";
export default function NewConfig() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEdit = searchParams.get("isEdit") === "true";
  const isDetail = !isEdit && id;
  const isAdd = !searchParams.get("id");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [appId, setAppId] = useState<string>("");
  const [appIdOptions, setAppIdOptions] = useState<AppInfo[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedInfo, setUploadedInfo] = useState<{
    id: string;
    filename: string;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchDetail = async () => {
      if (isAdd) {
        return;
      }
      try {
        setLoading(true)
        const res = await fetch(`/api/config/${id}`);
        const data = await res.json();
        if (res.ok && data?.errno === 0) {
          const { name, version, appId, configFileInfo } = data.data;
          setName(name ?? "");
          setVersion(version ?? "");
          setAppId(appId ?? "");
          if (configFileInfo?.id && configFileInfo?.filename) {
            setUploadedInfo({
              id: configFileInfo.id,
              filename: configFileInfo.filename,
            });
          } else {
            setUploadedInfo(null);
          }
        } else {
          toast.error(data?.message || "获取详情失败");
        }
      } catch {
        toast.error("获取详情失败");
      } finally {
        setLoading(false)
      }
    };
    getAppIdOptions();
    fetchDetail();
  }, [id, isEdit]);

  const getAppIdOptions = async () => {
    try {
      const res = await fetch("/api/apps");
      const data = await res.json();
      if (res.ok && data?.errno === 0) {
        setAppIdOptions(data.data);
      } else {
        toast.error(data?.message || "获取应用列表失败");
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "获取应用失败");
    }
  };
  const handleChangeAppId = (e: string | null) => {
    setAppId(e ?? "");
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFile(e.target.files?.[0] ?? null);
  };
  const handleUpload = async () => {

    setUploadedInfo(null);
    if (!file) {
      toast.error("请选择文件");
      return;
    }
    setIsUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok || data?.errno !== 0) {
        throw new Error(data?.message || "上传失败");
      }
      setUploadedInfo({
        id: data.data.id,
        filename: data.data.filename,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "上传失败");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = async (fileInfo: { id: string; filename: string }) => {
    try {
      const result = await fetch(`/api/upload/${fileInfo.id}`);
      const data = await result.json();
      if (!result.ok || data?.errno !== 0) {
        throw new Error(data?.message || "下载失败");
      }
      const fileData = data?.data;
      const mime: string = fileData?.mime || "application/octet-stream";
      const base64: string | undefined = fileData?.content;
      if (!base64) {
        throw new Error("文件内容为空");
      }

      const cleanedBase64 = base64.includes(",")
        ? base64.split(",").pop()!
        : base64;
      const binaryString = atob(cleanedBase64);
      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: mime });
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = fileInfo.filename || "download";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "下载文件失败");
    }
  };
  const handleDeleteFile = () => {
    setUploadedInfo(null);
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !version.trim() || !appId.trim()) {
      toast.error("请填写所有必填项");
      return;
    }
    setIsSubmitting(true);
    try {
      const url = isEdit && id ? `/api/table/${id}` : "/api/config";
      const method = isEdit ? "PUT" : "POST";
      const payload = isEdit
        ? {
          version,
          appId,
          configFileInfo: uploadedInfo
            ? { id: uploadedInfo.id, filename: uploadedInfo.filename }
            : null,
        }
        : {
          name,
          version,
          appId,
          configFileInfo: uploadedInfo
            ? { id: uploadedInfo.id, filename: uploadedInfo.filename }
            : null,
        };
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || data?.errno !== 0) {
        throw new Error(data?.message || "提交失败");
      }
      router.push("/config");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "提交失败，请稍后重试");
      console.error("提交失败:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push("/config");
  };

  const pageTitle = isEdit ? "编辑配置" : isDetail ? "详情" : "新增配置";

  return (
    <div className="mx-auto max-w-7xl">
      <PageBreadcrumb pageTitle={pageTitle} parentTitle="配置列表" parentHref="/config" />
      <div className="space-y-6 pl-10 pr-10">
        {loading && !isAdd ? (
          <div className="flex items-center justify-center h-60">
            <Spinner className="h-5 w-5 mx-auto size-6 text-primary" />
          </div>
        ) : (<form onSubmit={handleSubmit} className="space-y-6">
          <FieldGroup>
            <FieldSet>
              <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="name">名称</FieldLabel>
                  <Input
                    id="name"
                    placeholder="请输入"
                    disabled={!!isEdit || !!isDetail}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="version">版本</FieldLabel>
                  <Input
                    id="version"
                    placeholder="请输入"
                    disabled={!!isDetail}
                    value={version}
                    onChange={(e) => setVersion(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </FieldSet>
          </FieldGroup>

          <FieldGroup>
            <FieldSet>
              <FieldGroup className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field>
                  <FieldLabel htmlFor="appId">应用</FieldLabel>
                  <Select
                    value={appId}
                    onValueChange={(v) => handleChangeAppId(v)}
                    disabled={!!isDetail}
                  >
                    <SelectTrigger className="w-full" id="appId">
                      <SelectValue placeholder="请选择应用" />
                    </SelectTrigger>
                    <SelectContent>
                      {appIdOptions.map((item) => (
                        <SelectItem key={item.appId} value={item.appId}>
                          {item.appName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                {!isDetail ? (
                  <Field>
                    <FieldLabel htmlFor="configFile">配置文件</FieldLabel>
                    <div className="flex gap-2 items-center flex-wrap">
                      <Input
                        id="configFile"
                        ref={fileInputRef}
                        type="file"
                        onChange={(e) => handleFileChange(e)}
                        className="max-w-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleUpload}
                        disabled={isUploading || !file}
                      >
                        {isUploading ? "上传中..." : "上传"}
                      </Button>
                    </div>

                    {uploadedInfo ? (
                      <div className="flex items-center gap-2 flex-wrap mt-2">
                        <span className="text-sm text-muted-foreground">
                          已上传：{uploadedInfo.filename}
                        </span>
                        <Button
                          size="icon-xs"
                          variant="outline"
                          onClick={() => handleDownload(uploadedInfo)}
                        >
                          <Download className="size-3.5" />
                        </Button>
                        <Button
                          size="icon-xs"
                          variant="destructive"
                          onClick={() => handleDeleteFile()}
                        >
                          <Trash className="size-3.5" />
                        </Button>
                      </div>
                    ) : null}
                  </Field>
                ) : null}
              </FieldGroup>
            </FieldSet>
          </FieldGroup>

          {!isDetail ? (
            <div className="flex justify-end gap-3">
              <Button type="submit" size="sm" disabled={isSubmitting || !uploadedInfo?.id}>
                {isSubmitting ? "提交中..." : "提交"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                type="button"
                onClick={handleCancel}
              >
                取消
              </Button>
            </div>
          ) : null}
        </form>)}

      </div>
    </div>
  );
}
