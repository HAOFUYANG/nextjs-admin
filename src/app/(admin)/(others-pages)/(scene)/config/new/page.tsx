"use client";
import { useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Download, Trash } from "lucide-react";
import { toast } from "sonner";
import type { AppInfo } from "@/lib/schema";
import Button from "@/components/ui/button/Button";
import Input from "@/components/form/input/InputField";
import Label from "@/components/form/Label";
import Select from "@/components/form/Select";
import PageBreadcrumb from "@/components/common/PageBreadCrumb";

export default function NewConfig() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get("id");
  const isEdit = searchParams.get("isEdit") === "true";
  const isDetail = !isEdit && id;
  const isAdd = !searchParams.get("id");
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [appId, setAppId] = useState("");
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
        const res = await fetch(`/api/table/${id}`);
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
  const handleChangeAppId = (e: string) => {
    setAppId(e);
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
      <PageBreadcrumb pageTitle={pageTitle} />
      <div className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <Label>名称</Label>
            <Input
              placeholder="请输入"
              disabled={!!isEdit || !!isDetail}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <Label>版本</Label>
            <Input
              placeholder="请输入"
              disabled={!!isDetail}
              value={version}
              onChange={(e) => setVersion(e.target.value)}
            />
          </div>

          <div>
            <Label>应用</Label>
            <Select
              value={appId}
              onChange={(v) => handleChangeAppId(v)}
              disabled={!!isDetail}
              placeholder="请选择应用"
              options={appIdOptions.map((item) => ({
                value: item.appId,
                label: item.appName,
              }))}
            />
          </div>

          {!isDetail ? (
            <div>
              <Label>配置文件</Label>
              <div className="flex gap-2 items-center flex-wrap">
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={(e) => handleFileChange(e)}
                  className="h-9 rounded-lg border border-gray-300 px-3 py-1.5 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900 dark:text-white/90"
                />
                <Button
                  type="button"
                  onClick={handleUpload}
                  disabled={isUploading || !file}
                >
                  {isUploading ? "上传中..." : "上传"}
                </Button>
              </div>

              {uploadedInfo ? (
                <div className="flex items-center gap-2 flex-wrap mt-2">
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    已上传：{uploadedInfo.filename}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownload(uploadedInfo)}
                  >
                    <Download className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDeleteFile()}
                  >
                    <Trash className="w-4 h-4" />
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}

          {!isDetail ? (
            <div className="flex justify-end gap-3">
              <Button type="submit" disabled={isSubmitting || !uploadedInfo?.id}>
                {isSubmitting ? "提交中..." : "提交"}
              </Button>
              <Button
                variant="outline"
                type="button"
                onClick={handleCancel}
              >
                取消
              </Button>
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}
