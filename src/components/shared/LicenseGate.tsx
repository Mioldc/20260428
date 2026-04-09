import { type ReactElement, useState, useEffect, useCallback } from 'react';
import { Shield, Copy, FileUp, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

interface LicenseGateProps {
  onActivated: () => void;
}

export function LicenseGate({ onActivated }: LicenseGateProps): ReactElement {
  const [hardwareId, setHardwareId] = useState('');
  const [loading, setLoading] = useState(true);
  const [activating, setActivating] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadHwid(): Promise<void> {
      try {
        const { invoke } = await import('@tauri-apps/api/core');
        const hwid = await invoke<string>('get_hardware_id');
        setHardwareId(hwid);
      } catch (e) {
        setError(`获取机器码失败: ${e}`);
      } finally {
        setLoading(false);
      }
    }
    void loadHwid();
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(hardwareId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('复制失败');
    }
  }, [hardwareId]);

  const handleImport = useCallback(async () => {
    try {
      const { open } = await import('@tauri-apps/plugin-dialog');
      const { invoke } = await import('@tauri-apps/api/core');

      const filePath = await open({
        multiple: false,
        filters: [{ name: '授权文件', extensions: ['lic'] }],
      });
      if (!filePath) return;

      setActivating(true);
      setError('');

      await invoke('activate_license', { path: filePath });
      toast.success('授权激活成功');
      onActivated();
    } catch (e) {
      setError(`${e}`);
    } finally {
      setActivating(false);
    }
  }, [onActivated]);

  return (
    <div className="flex h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-6 w-6 text-primary" />
          </div>
          <CardTitle>软件授权</CardTitle>
          <CardDescription>请联系供应商获取授权文件以使用本系统</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <p className="text-center text-sm text-muted-foreground">获取机器码中...</p>
          ) : (
            <>
              <div className="space-y-2">
                <label className="text-sm font-medium">机器码</label>
                <div className="flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs break-all font-mono">
                    {hardwareId || '获取失败'}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => void handleCopy()}
                    disabled={!hardwareId}
                    title="复制机器码"
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-emerald-600" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  将此机器码发送给供应商以获取授权文件
                </p>
              </div>

              <Button className="w-full" onClick={() => void handleImport()} disabled={activating}>
                <FileUp className="h-4 w-4" />
                {activating ? '验证中...' : '导入授权文件 (.lic)'}
              </Button>

              {error && <p className="text-sm text-destructive text-center">{error}</p>}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
