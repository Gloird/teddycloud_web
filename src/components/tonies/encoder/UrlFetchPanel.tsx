import React from "react";
import {
    Button,
    Input,
    Select,
    Space,
    Tag,
    Tooltip,
    Typography,
    Collapse,
    Avatar,
    theme,
} from "antd";
import { LinkOutlined, CloudDownloadOutlined, InfoCircleOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import { UrlItem, SUPPORTED_SOURCES, QUALITY_OPTIONS, useUrlFetch } from "./hooks/useUrlFetch";
import { TeddyCloudApi } from "../../../api";
import { defaultAPIConfig } from "../../../config/defaultApiConfig";
import { useTeddyCloud } from "../../../contexts/TeddyCloudContext";
import { NotificationTypeEnum } from "../../../types/teddyCloudNotificationTypes";
import type { useEncoder } from "./hooks/useEncoder";

const { Text } = Typography;
const { useToken } = theme;

interface UrlFetchPanelProps {
    urlFetch: ReturnType<typeof useUrlFetch>;
    encoder: ReturnType<typeof useEncoder>;
    disabled?: boolean;
}

export const UrlFetchPanel: React.FC<UrlFetchPanelProps> = ({ urlFetch, encoder, disabled = false }) => {
    const { t } = useTranslation();
    const { token } = useToken();

    const {
        // urlList,
        inputUrl,
        quality,
        isProcessing,
        // hasUrls,
        setInputUrl,
        setQuality,
        // addUrl,
        // removeUrl,
        clearUrlList,
        formatDuration,
        // downloadAllUrls,
        // downloadUrl,
        // hasReadyUrls,
    } = urlFetch;

    const api = new TeddyCloudApi(defaultAPIConfig());
    const { addNotification } = useTeddyCloud();

    // encoder is passed from parent to share the same upload list/state

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter") {
            handleImport();
        }
    };

    const handleImport = async () => {
        const url = inputUrl.trim();
        if (!url) return;

        try {
            new URL(url);
        } catch {
            addNotification(
                NotificationTypeEnum.Error,
                t("tonies.encoder.urlFetch.invalidUrl"),
                t("tonies.encoder.urlFetch.invalidUrlDetails"),
                t("tonies.title")
            );
            return;
        }

        // 1) get info
        try {
            const infoResp = await api.apiPostTeddyCloudRaw("/api/urlInfo", `url=${encodeURIComponent(url)}`);
            const info = await infoResp.json();
            if (!info.success) {
                addNotification(NotificationTypeEnum.Error, t("tonies.encoder.urlFetch.error"), info.error || "Failed to get info", t("tonies.title"));
                return;
            }

            const title = info.data?.title;
            const thumbnail = info.data?.thumbnail;
            const duration = info.data?.duration;
            const uploader = info.data?.uploader;

            // 2) download
            addNotification(NotificationTypeEnum.Info, t("tonies.encoder.urlFetch.downloading"), title || url, t("tonies.title"));
            const fetchResp = await api.apiPostTeddyCloudRaw("/api/urlFetch", `url=${encodeURIComponent(url)}&quality=${encodeURIComponent(quality)}`);
            const fetchRes = await fetchResp.json();
            if (!fetchRes.success) {
                addNotification(NotificationTypeEnum.Error, t("tonies.encoder.urlFetch.error"), fetchRes.error || "Download failed", t("tonies.title"));
                return;
            }

            const filePath = fetchRes.relativePath || fetchRes.filePath;
            if (!filePath) {
                addNotification(NotificationTypeEnum.Error, t("tonies.encoder.urlFetch.error"), "No file path returned", t("tonies.title"));
                return;
            }

            // 3) add to encoder list with metadata
            encoder.addServerFile(filePath, title || undefined, url, thumbnail || undefined, duration || undefined, uploader || undefined);
            addNotification(NotificationTypeEnum.Success, t("tonies.encoder.urlFetch.downloaded"), title || filePath, t("tonies.title"));
            setInputUrl("");
        } catch (err) {
            addNotification(NotificationTypeEnum.Error, t("tonies.encoder.urlFetch.error"), String(err), t("tonies.title"));
        }
    };

    // URL imports are imported directly; status badges are not shown in a separate list.

    const supportedSourcesContent = (
        <div style={{ padding: "8px 0" }}>
            <Text type="secondary" style={{ marginBottom: 8, display: "block" }}>
                {t("tonies.encoder.urlFetch.supportedSourcesDescription")}
            </Text>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {SUPPORTED_SOURCES.map((source: { name: string; domain: string; icon: string }) => (
                    <Tag key={source.domain}>
                        {source.icon} {source.name}
                    </Tag>
                ))}
            </div>
        </div>
    );

    return (
        <div style={{ marginTop: 16 }}>
            <Collapse
                items={[
                    {
                        key: "url-fetch",
                        label: (
                            <Space>
                                <LinkOutlined />
                                {t("tonies.encoder.urlFetch.title")}
                            </Space>
                        ),
                        children: (
                            <Space direction="vertical" style={{ width: "100%" }} size="middle">
                                {/* Input Section */}
                                <Space.Compact style={{ width: "100%" }}>
                                    <Input
                                        size="middle"
                                        placeholder={t("tonies.encoder.urlFetch.inputPlaceholder")}
                                        value={inputUrl}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInputUrl(e.target.value)}
                                        onKeyDown={handleInputKeyDown}
                                        disabled={disabled || isProcessing}
                                        prefix={<LinkOutlined />}
                                        style={{ flex: 1, minWidth: '72%' }}
                                    />
                                    <Select
                                        size="middle"
                                        value={quality}
                                        onChange={setQuality}
                                        disabled={disabled || isProcessing}
                                        options={QUALITY_OPTIONS.map((opt: { value: string; label: string }) => ({
                                            value: opt.value,
                                            label: t(`tonies.encoder.urlFetch.quality.${opt.value}`, opt.label),
                                        }))}
                                    />
                                    <Button
                                        size="middle"
                                        type="primary"
                                        onClick={handleImport}
                                        disabled={disabled || isProcessing || !inputUrl.trim()}
                                        icon={<CloudDownloadOutlined />}
                                    >
                                        {t("tonies.encoder.urlFetch.addUrl")}
                                    </Button>
                                </Space.Compact>

                                {/* Supported Sources Info */}
                                <Collapse
                                    size="small"
                                    items={[
                                        {
                                            key: "sources",
                                            label: (
                                                <Space>
                                                    <InfoCircleOutlined />
                                                    {t("tonies.encoder.urlFetch.supportedSources")}
                                                </Space>
                                            ),
                                            children: supportedSourcesContent,
                                        },
                                    ]}
                                />

                                {/* URL imports are imported directly into the encoder file list; no separate URL list shown. */}
                            </Space>
                        ),
                    },
                ]}
            />
            {/* La modal de queue a été supprimée — import direct dans la liste d'upload */}
        </div>
    );
};
